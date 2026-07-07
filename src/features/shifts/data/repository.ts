import "server-only";

import { prisma } from "@/shared/server/db/prisma";
import type { Prisma } from "@prisma/client";

export async function findOpenShift(tenantId: string, branchId: string, cashierId: string) {
  return prisma.cashierShift.findFirst({
    where: { tenantId, branchId, cashierId, status: "OPEN" },
    orderBy: { openedAt: "desc" },
    select: { id: true, status: true, openedAt: true },
  });
}

export async function findExistingOpenShift(tenantId: string, branchId: string, cashierId: string) {
  return prisma.cashierShift.findFirst({
    where: { tenantId, branchId, cashierId, status: "OPEN" },
    orderBy: { openedAt: "desc" },
    select: { id: true, status: true, openedAt: true },
  });
}

export async function createShift(data: {
  tenantId: string;
  branchId: string;
  cashierId: string;
  openingCash: number;
  openNote: string | null;
}) {
  return prisma.cashierShift.create({
    data: { tenantId: data.tenantId, branchId: data.branchId, cashierId: data.cashierId, status: "OPEN", openingCash: data.openingCash, openNote: data.openNote },
    select: { id: true },
  });
}

export type SaleAgg = {
  _sum: { total: number | null };
  _count: { id: number };
};

export type PaymentAgg = Array<{
  method: string;
  _sum: { amount: number | null };
}>;

export async function aggregateSales(tenantId: string, shiftId: string): Promise<SaleAgg> {
  const result = await prisma.sale.aggregate({
    where: { tenantId, shiftId },
    _sum: { total: true },
    _count: { id: true },
  });
  return { _sum: { total: Number(result._sum?.total ?? 0) }, _count: { id: result._count.id } };
}

export async function aggregatePayments(tenantId: string, shiftId: string): Promise<PaymentAgg> {
  const result = await prisma.payment.groupBy({
    by: ["method"],
    orderBy: { method: "asc" },
    where: { tenantId, sale: { shiftId } },
    _sum: { amount: true },
  });
  return result.map((r) => ({ method: r.method, _sum: { amount: Number(r._sum?.amount ?? 0) } }));
}

export async function findShiftById(tenantId: string, shiftId: string) {
  return prisma.cashierShift.findFirst({
    where: { tenantId, id: shiftId },
    select: { id: true, status: true, branchId: true, cashierId: true },
  });
}

export async function updateShiftStatus(id: string, data: Prisma.CashierShiftUpdateInput) {
  return prisma.cashierShift.update({
    where: { id },
    data,
    select: { id: true },
  });
}

export async function findShiftDetail(tenantId: string, shiftId: string) {
  return prisma.cashierShift.findFirst({
    where: { tenantId, id: shiftId },
    include: {
      cashier: { select: { id: true, name: true, email: true } },
      branch: { select: { id: true, name: true, code: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function findShiftSales(tenantId: string, shiftId: string) {
  return prisma.sale.findMany({
    where: { tenantId, shiftId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, invoiceNo: true, status: true, total: true, createdAt: true },
  });
}

export async function findManyShifts(where: Prisma.CashierShiftWhereInput, take: number) {
  return prisma.cashierShift.findMany({
    where,
    orderBy: { openedAt: "desc" },
    take,
    include: {
      cashier: { select: { id: true, name: true, email: true } },
      branch: { select: { id: true, name: true, code: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
    },
  });
}
