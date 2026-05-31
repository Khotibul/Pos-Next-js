import "server-only";

import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import type { ApproveShiftInput, CloseShiftInput, OpenShiftInput } from "@/modules/shifts/validators";

function toNumber(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

export async function listShifts(params: {
  tenantId: string;
  branchId?: string | null;
  status?: "OPEN" | "CLOSED" | "APPROVED" | null;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  take?: number;
}) {
  const take = Math.max(1, Math.min(params.take ?? 50, 200));
  return prisma.cashierShift.findMany({
    where: {
      tenantId: params.tenantId,
      ...(params.branchId ? { branchId: params.branchId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.dateFrom || params.dateTo
        ? {
            openedAt: {
              ...(params.dateFrom ? { gte: params.dateFrom } : {}),
              ...(params.dateTo ? { lte: params.dateTo } : {}),
            },
          }
        : {}),
    },
    orderBy: { openedAt: "desc" },
    take,
    include: {
      cashier: { select: { id: true, name: true, email: true } },
      branch: { select: { id: true, name: true, code: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function getOpenShift(params: { tenantId: string; branchId: string; cashierId: string }) {
  return prisma.cashierShift.findFirst({
    where: { tenantId: params.tenantId, branchId: params.branchId, cashierId: params.cashierId, status: "OPEN" },
    orderBy: { openedAt: "desc" },
  });
}

export async function openShift(params: { tenantId: string; branchId: string; cashierId: string; input: OpenShiftInput }) {
  const existing = await getOpenShift({ tenantId: params.tenantId, branchId: params.branchId, cashierId: params.cashierId });
  if (existing) throw Errors.badRequest("Shift masih OPEN. Tutup shift terlebih dahulu.");

  return prisma.cashierShift.create({
    data: {
      tenantId: params.tenantId,
      branchId: params.branchId,
      cashierId: params.cashierId,
      status: "OPEN",
      openingCash: params.input.openingCash,
      openNote: (params.input.openNote || "").trim() || null,
    },
    select: { id: true },
  });
}

export async function calculateShiftSummary(params: { tenantId: string; shiftId: string }) {
  const [salesAgg, paymentsAgg] = await prisma.$transaction([
    prisma.sale.aggregate({
      where: { tenantId: params.tenantId, shiftId: params.shiftId },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.payment.groupBy({
      by: ["method"],
      orderBy: { method: "asc" },
      where: { tenantId: params.tenantId, sale: { shiftId: params.shiftId } },
      _sum: { amount: true },
    }),
  ]);

  const methodSum = new Map<string, number>();
  for (const row of paymentsAgg) {
    methodSum.set(row.method, toNumber(row._sum?.amount));
  }

  const totalSales = toNumber(salesAgg._sum.total);
  const totalCash = methodSum.get("CASH") ?? 0;
  const totalQris = methodSum.get("QRIS") ?? 0;
  const totalTransfer = methodSum.get("TRANSFER") ?? 0;
  const totalEwallet = methodSum.get("EWALLET") ?? 0;

  return {
    totalSales,
    totalCash,
    totalQris,
    totalTransfer,
    totalEwallet,
    transactionCount: salesAgg._count.id,
    cashSystem: totalCash,
  };
}

export async function closeShift(params: { tenantId: string; cashierId: string; input: CloseShiftInput; allowAnyCashier?: boolean }) {
  const shift = await prisma.cashierShift.findFirst({
    where: {
      id: params.input.shiftId,
      tenantId: params.tenantId,
      ...(params.allowAnyCashier ? {} : { cashierId: params.cashierId }),
    },
    select: { id: true, status: true },
  });
  if (!shift) throw Errors.notFound("Shift tidak ditemukan.");
  if (shift.status !== "OPEN") throw Errors.badRequest("Shift sudah ditutup.");

  const summary = await calculateShiftSummary({ tenantId: params.tenantId, shiftId: params.input.shiftId });
  const cashCounted = params.input.cashCounted;
  const cashDifference = cashCounted - summary.cashSystem;

  return prisma.cashierShift.update({
    where: { id: params.input.shiftId },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      cashSystem: summary.cashSystem,
      cashCounted,
      cashDifference,
      totalSales: summary.totalSales,
      totalCash: summary.totalCash,
      totalQris: summary.totalQris,
      totalTransfer: summary.totalTransfer,
      totalEwallet: summary.totalEwallet,
      transactionCount: summary.transactionCount,
      closeNote: (params.input.closeNote || "").trim() || null,
    },
    select: { id: true },
  });
}

export async function approveShift(params: { tenantId: string; approvedById: string; input: ApproveShiftInput }) {
  const shift = await prisma.cashierShift.findFirst({
    where: { id: params.input.shiftId, tenantId: params.tenantId },
    select: { id: true, status: true },
  });
  if (!shift) throw Errors.notFound("Shift tidak ditemukan.");
  if (shift.status === "OPEN") throw Errors.badRequest("Shift masih OPEN.");
  if (shift.status === "APPROVED") return { id: shift.id };

  return prisma.cashierShift.update({
    where: { id: shift.id },
    data: { status: "APPROVED", approvedById: params.approvedById, approvedAt: new Date() },
    select: { id: true },
  });
}

export async function getShiftDetail(params: { tenantId: string; shiftId: string }) {
  const shift = await prisma.cashierShift.findFirst({
    where: { tenantId: params.tenantId, id: params.shiftId },
    include: {
      cashier: { select: { id: true, name: true, email: true } },
      branch: { select: { id: true, name: true, code: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
    },
  });
  if (!shift) throw Errors.notFound("Shift tidak ditemukan.");

  const summary = await calculateShiftSummary({ tenantId: params.tenantId, shiftId: params.shiftId });
  const sales = await prisma.sale.findMany({
    where: { tenantId: params.tenantId, shiftId: params.shiftId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, invoiceNo: true, status: true, total: true, createdAt: true },
  });

  return { shift, summary, sales };
}
