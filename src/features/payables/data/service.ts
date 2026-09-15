import "server-only";
import { prisma } from "@/shared/server/db/prisma";
import { Errors } from "@/shared/server/errors/app-error";
import type { UpsertPayableInput, CreatePayablePaymentInput } from "@/features/payables/validators";
import type { PayableOverview } from "@/features/payables/domain/entity";
import { computeDebtStatus } from "@/shared/utils/debt-status";

export async function getPayableOverview(params: { tenantId: string }): Promise<PayableOverview> {
  try {
    const all = await prisma.payable.findMany({
      where: { tenantId: params.tenantId },
      select: { status: true, totalAmount: true, paidAmount: true, remainingAmount: true },
    });
    const total = all.length;
    let unpaid = 0, partial = 0, paid = 0, overdue = 0;
    let totalPayable = 0, totalPaid = 0, totalRemaining = 0;
    for (const r of all) {
      if (r.status === "UNPAID") unpaid++;
      else if (r.status === "PARTIAL") partial++;
      else if (r.status === "PAID") paid++;
      else if (r.status === "OVERDUE") overdue++;
      totalPayable += Number(r.totalAmount);
      totalPaid += Number(r.paidAmount);
      totalRemaining += Number(r.remainingAmount);
    }
    return { total, unpaid, partial, paid, overdue, totalPayable, totalPaid, totalRemaining };
  } catch {
    return { total: 0, unpaid: 0, partial: 0, paid: 0, overdue: 0, totalPayable: 0, totalPaid: 0, totalRemaining: 0 };
  }
}

export async function listPayables(params: { tenantId: string; q?: string | null; status?: string | null; page?: number; pageSize?: number }) {
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
        { supplier: { name: { contains: q, mode: "insensitive" } } },
      ];
    }
    if (status) (where as Record<string, unknown>).status = status;

    const [total, items] = await Promise.all([
      prisma.payable.count({ where: where as never }),
      prisma.payable.findMany({
        where: where as never,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { supplier: { select: { name: true } } },
      }),
    ]);

    const mapped = items.map((r) => ({
      id: r.id,
      invoiceNo: r.invoiceNo,
      description: r.description,
      supplierId: r.supplierId,
      supplierName: r.supplier?.name ?? null,
      purchaseOrderId: r.purchaseOrderId,
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

export async function getPayableById(params: { tenantId: string; id: string }) {
  const rec = await prisma.payable.findFirst({
    where: { tenantId: params.tenantId, id: params.id },
    include: { supplier: { select: { name: true } }, payments: { orderBy: { paidAt: "desc" } } },
  });
  if (!rec) throw Errors.notFound("Utang tidak ditemukan.");
  return {
    id: rec.id,
    invoiceNo: rec.invoiceNo,
    description: rec.description,
    supplierId: rec.supplierId,
    supplierName: rec.supplier?.name ?? null,
    purchaseOrderId: rec.purchaseOrderId,
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

export async function upsertPayable(params: { tenantId: string; input: UpsertPayableInput }) {
  const dueDate = params.input.dueDate ? new Date(params.input.dueDate) : null;
  if (dueDate && isNaN(dueDate.getTime())) throw Errors.badRequest("Tanggal jatuh tempo tidak valid.");

  if (params.input.supplierId) {
    const s = await prisma.supplier.findFirst({ where: { tenantId: params.tenantId, id: params.input.supplierId }, select: { id: true } });
    if (!s) throw Errors.badRequest("Supplier tidak ditemukan.");
  }
  if (params.input.purchaseOrderId) {
    const po = await prisma.purchaseOrder.findFirst({ where: { tenantId: params.tenantId, id: params.input.purchaseOrderId }, select: { id: true } });
    if (!po) throw Errors.badRequest("Purchase Order tidak ditemukan.");
  }

  const totalAmount = params.input.totalAmount;

  if (params.input.id) {
    const exists = await prisma.payable.findFirst({ where: { tenantId: params.tenantId, id: params.input.id }, select: { id: true, paidAmount: true } });
    if (!exists) throw Errors.notFound("Utang tidak ditemukan.");
    const paidAmount = Number(exists.paidAmount);
    const remaining = Math.max(0, totalAmount - paidAmount);
    const status = computeDebtStatus(totalAmount, paidAmount, dueDate);
    return prisma.payable.update({
      where: { id: params.input.id },
      data: {
        supplierId: params.input.supplierId ?? null,
        purchaseOrderId: params.input.purchaseOrderId ?? null,
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

  const dup = await prisma.payable.findFirst({ where: { tenantId: params.tenantId, invoiceNo: params.input.invoiceNo }, select: { id: true } });
  if (dup) throw Errors.badRequest("Invoice utang sudah ada.");

  const status = computeDebtStatus(totalAmount, 0, dueDate);
  return prisma.payable.create({
    data: {
      tenantId: params.tenantId,
      supplierId: params.input.supplierId ?? null,
      purchaseOrderId: params.input.purchaseOrderId ?? null,
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

export async function deletePayable(params: { tenantId: string; id: string }) {
  const exists = await prisma.payable.findFirst({ where: { tenantId: params.tenantId, id: params.id }, select: { id: true } });
  if (!exists) throw Errors.notFound("Utang tidak ditemukan.");
  await prisma.payable.delete({ where: { id: params.id } });
}

export async function createPayablePayment(params: { tenantId: string; input: CreatePayablePaymentInput }) {
  const payable = await prisma.payable.findFirst({ where: { tenantId: params.tenantId, id: params.input.payableId }, select: { id: true, totalAmount: true, paidAmount: true, dueDate: true } });
  if (!payable) throw Errors.notFound("Utang tidak ditemukan.");

  const total = Number(payable.totalAmount);
  const paid = Number(payable.paidAmount);
  const remaining = total - paid;
  if (params.input.amount > remaining) throw Errors.badRequest(`Pembayaran melebihi sisa utang. Sisa: ${remaining.toLocaleString("id-ID")}`);

  const paidAt = params.input.paidAt ? new Date(params.input.paidAt) : new Date();
  if (isNaN(paidAt.getTime())) throw Errors.badRequest("Tanggal bayar tidak valid.");

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payablePayment.create({
      data: {
        tenantId: params.tenantId,
        payableId: params.input.payableId,
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
    const newStatus = computeDebtStatus(total, newPaid, payable.dueDate);

    await tx.payable.update({
      where: { id: params.input.payableId },
      data: { paidAmount: newPaid, remainingAmount: newRemaining, status: newStatus },
    });

    return payment;
  });
}

export async function deletePayablePayment(params: { tenantId: string; paymentId: string }) {
  const payment = await prisma.payablePayment.findFirst({ where: { tenantId: params.tenantId, id: params.paymentId }, select: { id: true, payableId: true, amount: true } });
  if (!payment) throw Errors.notFound("Pembayaran tidak ditemukan.");

  const payable = await prisma.payable.findFirst({ where: { tenantId: params.tenantId, id: payment.payableId }, select: { id: true, totalAmount: true, paidAmount: true, dueDate: true } });
  if (!payable) throw Errors.notFound("Utang tidak ditemukan.");

  return prisma.$transaction(async (tx) => {
    await tx.payablePayment.delete({ where: { id: payment.id } });
    const newPaid = Math.max(0, Number(payable.paidAmount) - Number(payment.amount));
    const total = Number(payable.totalAmount);
    const newRemaining = Math.max(0, total - newPaid);
    const newStatus = computeDebtStatus(total, newPaid, payable.dueDate);
    await tx.payable.update({ where: { id: payable.id }, data: { paidAmount: newPaid, remainingAmount: newRemaining, status: newStatus } });
  });
}
