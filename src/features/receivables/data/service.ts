import "server-only";
import { prisma } from "@/shared/server/db/prisma";
import { Errors } from "@/shared/server/errors/app-error";
import type { UpsertReceivableInput, CreateReceivablePaymentInput } from "@/features/receivables/validators";
import type { ReceivableOverview } from "@/features/receivables/domain/entity";
import { computeDebtStatus } from "@/shared/utils/debt-status";

export async function getReceivableOverview(params: { tenantId: string }): Promise<ReceivableOverview> {
  try {
    const all = await prisma.receivable.findMany({
      where: { tenantId: params.tenantId },
      select: { status: true, totalAmount: true, paidAmount: true, remainingAmount: true },
    });
    const total = all.length;
    let unpaid = 0, partial = 0, paid = 0, overdue = 0;
    let totalReceivable = 0, totalPaid = 0, totalRemaining = 0;
    for (const r of all) {
      if (r.status === "UNPAID") unpaid++;
      else if (r.status === "PARTIAL") partial++;
      else if (r.status === "PAID") paid++;
      else if (r.status === "OVERDUE") overdue++;
      totalReceivable += Number(r.totalAmount);
      totalPaid += Number(r.paidAmount);
      totalRemaining += Number(r.remainingAmount);
    }
    return { total, unpaid, partial, paid, overdue, totalReceivable, totalPaid, totalRemaining };
  } catch {
    return { total: 0, unpaid: 0, partial: 0, paid: 0, overdue: 0, totalReceivable: 0, totalPaid: 0, totalRemaining: 0 };
  }
}

export async function listReceivables(params: { tenantId: string; q?: string | null; status?: string | null; page?: number; pageSize?: number }) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10));
  const q = params.q?.trim() || null;
  const status = params.status?.trim() || null;

  try {
    const where: Record<string, unknown> = { tenantId: params.tenantId };
    if (q) {
      (where as Record<string, unknown>).OR = [
        { invoiceNo: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
        { customer: { name: { contains: q, mode: "insensitive" } } },
      ];
    }
    if (status) (where as Record<string, unknown>).status = status;

    const [total, items] = await Promise.all([
      prisma.receivable.count({ where: where as never }),
      prisma.receivable.findMany({
        where: where as never,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { customer: { select: { name: true } } },
      }),
    ]);

    const mapped = items.map((r) => ({
      id: r.id,
      invoiceNo: r.invoiceNo,
      description: r.description,
      customerId: r.customerId,
      customerName: r.customer?.name ?? null,
      saleId: r.saleId,
      totalAmount: Number(r.totalAmount),
      paidAmount: Number(r.paidAmount),
      remainingAmount: Number(r.remainingAmount),
      dueDate: r.dueDate,
      status: r.status,
      notes: r.notes,
      createdAt: r.createdAt,
    }));

    return { items: mapped, total, page, pageSize, q, status };
  } catch {
    return { items: [], total: 0, page, pageSize, q, status };
  }
}

export async function getReceivableById(params: { tenantId: string; id: string }) {
  const rec = await prisma.receivable.findFirst({
    where: { tenantId: params.tenantId, id: params.id },
    include: { customer: { select: { name: true } }, payments: { orderBy: { paidAt: "desc" } } },
  });
  if (!rec) throw Errors.notFound("Piutang tidak ditemukan.");
  return {
    id: rec.id,
    invoiceNo: rec.invoiceNo,
    description: rec.description,
    customerId: rec.customerId,
    customerName: rec.customer?.name ?? null,
    saleId: rec.saleId,
    totalAmount: Number(rec.totalAmount),
    paidAmount: Number(rec.paidAmount),
    remainingAmount: Number(rec.remainingAmount),
    dueDate: rec.dueDate,
    status: rec.status,
    notes: rec.notes,
    createdAt: rec.createdAt,
    payments: rec.payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      method: p.method,
      reference: p.reference,
      notes: p.notes,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    })),
  };
}

export async function upsertReceivable(params: { tenantId: string; input: UpsertReceivableInput }) {
  const dueDate = params.input.dueDate ? new Date(params.input.dueDate) : null;
  if (dueDate && isNaN(dueDate.getTime())) throw Errors.badRequest("Tanggal jatuh tempo tidak valid.");

  if (params.input.customerId) {
    const c = await prisma.customer.findFirst({ where: { tenantId: params.tenantId, id: params.input.customerId }, select: { id: true } });
    if (!c) throw Errors.badRequest("Pelanggan tidak ditemukan.");
  }
  if (params.input.saleId) {
    const s = await prisma.sale.findFirst({ where: { tenantId: params.tenantId, id: params.input.saleId }, select: { id: true } });
    if (!s) throw Errors.badRequest("Transaksi penjualan tidak ditemukan.");
  }

  const totalAmount = params.input.totalAmount;
  // For update, keep paidAmount as is; for create, paidAmount=0
  if (params.input.id) {
    const exists = await prisma.receivable.findFirst({ where: { tenantId: params.tenantId, id: params.input.id }, select: { id: true, paidAmount: true, totalAmount: true } });
    if (!exists) throw Errors.notFound("Piutang tidak ditemukan.");
    const paidAmount = Number(exists.paidAmount);
    const remaining = Math.max(0, totalAmount - paidAmount);
    const status = computeDebtStatus(totalAmount, paidAmount, dueDate);
    return prisma.receivable.update({
      where: { id: params.input.id },
      data: {
        customerId: params.input.customerId ?? null,
        saleId: params.input.saleId ?? null,
        invoiceNo: params.input.invoiceNo,
        description: params.input.description ?? null,
        totalAmount,
        remainingAmount: remaining,
        dueDate,
        status,
        notes: params.input.notes ?? null,
      },
      select: { id: true },
    });
  }

  // check duplicate invoiceNo per tenant
  const dup = await prisma.receivable.findFirst({ where: { tenantId: params.tenantId, invoiceNo: params.input.invoiceNo }, select: { id: true } });
  if (dup) throw Errors.badRequest("Invoice piutang sudah ada.");

  const status = computeDebtStatus(totalAmount, 0, dueDate);
  return prisma.receivable.create({
    data: {
      tenantId: params.tenantId,
      customerId: params.input.customerId ?? null,
      saleId: params.input.saleId ?? null,
      invoiceNo: params.input.invoiceNo,
      description: params.input.description ?? null,
      totalAmount,
      paidAmount: 0,
      remainingAmount: totalAmount,
      dueDate,
      status,
      notes: params.input.notes ?? null,
    },
    select: { id: true },
  });
}

export async function deleteReceivable(params: { tenantId: string; id: string }) {
  const exists = await prisma.receivable.findFirst({ where: { tenantId: params.tenantId, id: params.id }, select: { id: true } });
  if (!exists) throw Errors.notFound("Piutang tidak ditemukan.");
  await prisma.receivable.delete({ where: { id: params.id } });
}

export async function createReceivablePayment(params: { tenantId: string; input: CreateReceivablePaymentInput }) {
  const receivable = await prisma.receivable.findFirst({ where: { tenantId: params.tenantId, id: params.input.receivableId }, select: { id: true, totalAmount: true, paidAmount: true, dueDate: true } });
  if (!receivable) throw Errors.notFound("Piutang tidak ditemukan.");

  const total = Number(receivable.totalAmount);
  const paid = Number(receivable.paidAmount);
  const remaining = total - paid;
  if (params.input.amount > remaining) throw Errors.badRequest(`Pembayaran melebihi sisa piutang. Sisa: ${remaining.toLocaleString("id-ID")}`);

  const paidAt = params.input.paidAt ? new Date(params.input.paidAt) : new Date();
  if (isNaN(paidAt.getTime())) throw Errors.badRequest("Tanggal bayar tidak valid.");

  return prisma.$transaction(async (tx) => {
    const payment = await tx.receivablePayment.create({
      data: {
        tenantId: params.tenantId,
        receivableId: params.input.receivableId,
        amount: params.input.amount,
        method: params.input.method.toUpperCase(),
        reference: params.input.reference ?? null,
        notes: params.input.notes ?? null,
        paidAt,
      },
      select: { id: true },
    });

    const newPaid = paid + params.input.amount;
    const newRemaining = Math.max(0, total - newPaid);
    const newStatus = computeDebtStatus(total, newPaid, receivable.dueDate);

    await tx.receivable.update({
      where: { id: params.input.receivableId },
      data: { paidAmount: newPaid, remainingAmount: newRemaining, status: newStatus },
    });

    return payment;
  });
}

export async function deleteReceivablePayment(params: { tenantId: string; paymentId: string }) {
  const payment = await prisma.receivablePayment.findFirst({ where: { tenantId: params.tenantId, id: params.paymentId }, select: { id: true, receivableId: true, amount: true } });
  if (!payment) throw Errors.notFound("Pembayaran tidak ditemukan.");

  const receivable = await prisma.receivable.findFirst({ where: { tenantId: params.tenantId, id: payment.receivableId }, select: { id: true, totalAmount: true, paidAmount: true, dueDate: true } });
  if (!receivable) throw Errors.notFound("Piutang tidak ditemukan.");

  return prisma.$transaction(async (tx) => {
    await tx.receivablePayment.delete({ where: { id: payment.id } });
    const newPaid = Math.max(0, Number(receivable.paidAmount) - Number(payment.amount));
    const total = Number(receivable.totalAmount);
    const newRemaining = Math.max(0, total - newPaid);
    const newStatus = computeDebtStatus(total, newPaid, receivable.dueDate);
    await tx.receivable.update({ where: { id: receivable.id }, data: { paidAmount: newPaid, remainingAmount: newRemaining, status: newStatus } });
  });
}
