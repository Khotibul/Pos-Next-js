import "server-only";

import { Errors } from "@/shared/server/errors/app-error";
import type { Prisma } from "@prisma/client";
import * as repo from "@/features/shifts/data/repository";
import type { ShiftSummary, ShiftDetailResult } from "@/features/shifts/domain/entity";
import type { OpenShiftInput, CloseShiftInput, ApproveShiftInput } from "@/features/shifts/validators";

function toNumber(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

export async function listShifts(params: {
  tenantId: string;
  branchId?: string | null;
  cashierId?: string | null;
  status?: "OPEN" | "CLOSED" | "APPROVED" | null;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  take?: number;
}) {
  const take = Math.max(1, Math.min(params.take ?? 50, 200));
  return repo.findManyShifts({
    tenantId: params.tenantId,
    ...(params.branchId ? { branchId: params.branchId } : {}),
    ...(params.cashierId ? { cashierId: params.cashierId } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.dateFrom || params.dateTo ? { openedAt: { ...(params.dateFrom ? { gte: params.dateFrom } : {}), ...(params.dateTo ? { lte: params.dateTo } : {}) } } : {}),
  }, take);
}

export async function getOpenShift(params: { tenantId: string; branchId: string; cashierId: string }) {
  return repo.findOpenShift(params.tenantId, params.branchId, params.cashierId);
}

export async function openShift(params: { tenantId: string; branchId: string; cashierId: string; input: OpenShiftInput }) {
  const existing = await repo.findExistingOpenShift(params.tenantId, params.branchId, params.cashierId);
  if (existing) throw Errors.badRequest("Shift masih OPEN. Tutup shift terlebih dahulu.");

  const created = await repo.createShift({
    tenantId: params.tenantId,
    branchId: params.branchId,
    cashierId: params.cashierId,
    openingCash: params.input.openingCash,
    openNote: (params.input.openNote || "").trim() || null,
  });
  const { deleteCache } = await import("@/shared/server/cache/redis");
  void deleteCache(`shift:open:${params.tenantId}:${params.branchId}:${params.cashierId}`);
  return created;
}

export async function calculateShiftSummary(params: { tenantId: string; shiftId: string }): Promise<ShiftSummary> {
  const [salesAgg, paymentsAgg] = await Promise.all([
    repo.aggregateSales(params.tenantId, params.shiftId),
    repo.aggregatePayments(params.tenantId, params.shiftId),
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
    totalSales, totalCash, totalQris, totalTransfer, totalEwallet,
    transactionCount: salesAgg._count.id,
    cashSystem: totalCash,
  };
}

export async function closeShift(params: { tenantId: string; cashierId: string; input: CloseShiftInput; allowAnyCashier?: boolean }) {
  const shift = await repo.findShiftById(params.tenantId, params.input.shiftId);
  if (!shift) throw Errors.notFound("Shift tidak ditemukan.");
  if (params.allowAnyCashier && shift.cashierId !== params.cashierId) {
    // OK for admins
  }
  if (shift.status !== "OPEN") throw Errors.badRequest("Shift sudah ditutup.");

  const summary = await calculateShiftSummary({ tenantId: params.tenantId, shiftId: params.input.shiftId });
  const cashCounted = params.input.cashCounted;
  const cashDifference = cashCounted - summary.cashSystem;

  const updated = await repo.updateShiftStatus(params.input.shiftId, {
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
  });
  const { deleteCache } = await import("@/shared/server/cache/redis");
  void deleteCache(`shift:open:${params.tenantId}:${shift.branchId}:${shift.cashierId}`);
  return updated;
}

export async function approveShift(params: { tenantId: string; approvedById: string; input: ApproveShiftInput }) {
  const shift = await repo.findShiftById(params.tenantId, params.input.shiftId);
  if (!shift) throw Errors.notFound("Shift tidak ditemukan.");
  if (shift.status === "OPEN") throw Errors.badRequest("Shift masih OPEN.");
  if (shift.status === "APPROVED") return { id: shift.id };

  return repo.updateShiftStatus(params.input.shiftId, {
    status: "APPROVED",
    approvedBy: { connect: { id: params.approvedById } },
    approvedAt: new Date(),
  } as Prisma.CashierShiftUpdateInput);
}

export async function getShiftDetail(params: { tenantId: string; shiftId: string }): Promise<ShiftDetailResult> {
  const shift = await repo.findShiftDetail(params.tenantId, params.shiftId);
  if (!shift) throw Errors.notFound("Shift tidak ditemukan.");

  const summary = await calculateShiftSummary({ tenantId: params.tenantId, shiftId: params.shiftId });
  const sales = await repo.findShiftSales(params.tenantId, params.shiftId);

  const salesMapped = sales.map((s) => ({ ...s, total: Number(s.total) }));
  return { shift, summary, sales: salesMapped };
}
