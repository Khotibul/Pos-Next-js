import "server-only";

import { prisma } from "@/shared/server/db/prisma";
import type { Prisma } from "@prisma/client";

export type StockRow = {
  id: string;
  productId: string;
  qty: number;
};

export type ShiftInfo = {
  id: string;
  branchId: string;
};

export async function findShiftById(tenantId: string, shiftId: string, cashierId?: string | null) {
  return prisma.cashierShift.findFirst({
    where: {
      tenantId,
      id: shiftId,
      status: "OPEN",
      ...(cashierId ? { cashierId } : {}),
    },
    select: { id: true, branchId: true },
  });
}

export async function findSale(tenantId: string, id: string) {
  return prisma.sale.findFirst({
    where: { tenantId, id },
    select: { id: true, invoiceNo: true, total: true, status: true, createdAt: true },
  });
}

export async function countSales(where: Prisma.SaleWhereInput) {
  return prisma.sale.count({ where });
}

export async function findSales(where: Prisma.SaleWhereInput, orderBy: Prisma.SaleOrderByWithRelationInput, skip: number, take: number) {
  return prisma.sale.findMany({
    where,
    orderBy,
    skip,
    take,
    select: { id: true, invoiceNo: true, total: true, status: true, createdAt: true },
  });
}

export async function findSaleDetail(tenantId: string, id: string) {
  return prisma.sale.findFirst({
    where: { tenantId, id },
    select: {
      id: true,
      invoiceNo: true,
      cashierId: true,
      shiftId: true,
      subtotal: true,
      tax: true,
      discount: true,
      total: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      items: { select: { id: true, productId: true, name: true, sku: true, price: true, qty: true, lineTotal: true } },
      payments: { select: { id: true, method: true, amount: true, receivedAmount: true, changeAmount: true, reference: true, createdAt: true } },
    },
  });
}

export async function findAvailableStock(tenantId: string, productIds: string[], branchId: string) {
  return prisma.productWarehouseStock.findMany({
    where: {
      tenantId,
      productId: { in: productIds },
      warehouse: { tenantId, isActive: true, OR: [{ branchId }, { branchId: null }] },
      qty: { gt: 0 },
    },
    orderBy: [{ productId: "asc" }, { updatedAt: "asc" }],
    select: { id: true, productId: true, qty: true },
  });
}

export async function decrementStockRaw(
  client: Prisma.TransactionClient | typeof prisma,
  tenantId: string,
  decrements: Array<{ id: string; qty: number }>,
) {
  if (decrements.length === 0) return 0;
  const placeholders = decrements.map((_, i) => `($${2 + i * 2}::text, $${3 + i * 2}::decimal)`).join(", ");
  const rawParams: Array<string | number> = [tenantId];
  for (const d of decrements) {
    rawParams.push(d.id, d.qty);
  }
  return (client as unknown as typeof prisma).$executeRawUnsafe(
    `UPDATE "ProductWarehouseStock" AS pws
     SET "qty" = pws.qty - v.qty
     FROM (VALUES ${placeholders}) AS v(id, qty)
     WHERE pws.id = v.id AND pws."tenantId" = $1 AND pws.qty >= v.qty`,
    ...rawParams,
  );
}

export async function createSaleInTransaction(
  tx: Prisma.TransactionClient,
  data: {
    tenantId: string;
    invoiceNo: string;
    cashierId: string | null;
    shiftId: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    lines: Array<{ productId: string; name: string; sku: string; price: number; qty: number; lineTotal: number }>;
    payment: { method: string; amount: number; receivedAmount: number; changeAmount: number; reference: string | null };
  },
) {
  return tx.sale.create({
    data: {
      tenantId: data.tenantId,
      invoiceNo: data.invoiceNo,
      cashierId: data.cashierId,
      shiftId: data.shiftId,
      subtotal: data.subtotal,
      discount: data.discount,
      tax: data.tax,
      total: data.total,
      status: "PAID",
      items: { create: data.lines.map((l) => ({ tenantId: data.tenantId, ...l })) },
      payments: { create: { tenantId: data.tenantId, ...data.payment } },
    },
    select: { id: true, invoiceNo: true, total: true, createdAt: true, discount: true, tax: true, subtotal: true, status: true },
  });
}

export async function updateShiftTotals(tx: Prisma.TransactionClient, shiftId: string, totals: {
  total: number;
  cashTotal: number;
  qrisTotal: number;
  transferTotal: number;
  ewalletTotal: number;
}) {
  return tx.cashierShift.updateMany({
    where: { id: shiftId, status: "OPEN" },
    data: {
      totalSales: { increment: totals.total },
      transactionCount: { increment: 1 },
      cashSystem: { increment: totals.cashTotal },
      totalCash: { increment: totals.cashTotal },
      totalQris: { increment: totals.qrisTotal },
      totalTransfer: { increment: totals.transferTotal },
      totalEwallet: { increment: totals.ewalletTotal },
    },
  });
}

export async function deleteSaleById(id: string) {
  await prisma.sale.delete({ where: { id } });
}
