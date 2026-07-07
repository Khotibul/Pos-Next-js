import "server-only";

import { prisma } from "@/shared/server/db/prisma";
import type { Prisma } from "@prisma/client";

export type StockAgg = { productId: string; _sum: { qty: number | null } };

export async function countProducts(where: Prisma.ProductWhereInput) {
  return prisma.product.count({ where });
}

export async function findProducts(where: Prisma.ProductWhereInput, skip: number, take: number) {
  return prisma.product.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip,
    take,
    select: {
      id: true,
      sku: true,
      name: true,
      barcode: true,
      category: { select: { id: true, name: true } },
      costPrice: true,
      sellingPrice: true,
      wholesalePrice: true,
      wholesaleDiscountPercent: true,
      wholesaleMinQty: true,
      isActive: true,
      updatedAt: true,
    },
  });
}

export async function getStockAggregate(tenantId: string, productIds: string[]): Promise<StockAgg[]> {
  if (productIds.length === 0) return [];
  const result = await prisma.productWarehouseStock.groupBy({
    by: ["productId"],
    where: { tenantId, productId: { in: productIds } },
    _sum: { qty: true },
  });
  return result.map((r) => ({ productId: r.productId, _sum: { qty: Number(r._sum?.qty ?? 0) } }));
}

export async function findProductById(tenantId: string, id: string) {
  return prisma.product.findFirst({ where: { tenantId, id } });
}

export async function createProductInTransaction(tx: Prisma.TransactionClient, _tenantId: string, data: Prisma.ProductCreateInput) {
  return tx.product.create({ data, select: { id: true } });
}

export async function findFirstWarehouse(tenantId: string) {
  return prisma.warehouse.findFirst({
    where: { tenantId, isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
}

export async function createWarehouse(tenantId: string) {
  return prisma.warehouse.create({
    data: { tenantId, name: "Main Warehouse", type: "BRANCH", isActive: true },
    select: { id: true },
  });
}

export async function createProductStock(tx: Prisma.TransactionClient, data: {
  tenantId: string;
  warehouseId: string;
  productId: string;
  qty: number;
}) {
  return tx.productWarehouseStock.create({
    data: { tenantId: data.tenantId, warehouseId: data.warehouseId, productId: data.productId, variantId: null, batchId: null, qty: data.qty },
    select: { id: true },
  });
}

export async function updateProductById(tx: Prisma.TransactionClient, id: string, data: Prisma.ProductUpdateInput) {
  return tx.product.update({ where: { id }, data, select: { id: true } });
}

export async function deleteProductById(id: string) {
  await prisma.product.delete({ where: { id } });
}

export async function deleteManyProductsByIds(tenantId: string, ids: string[]) {
  return prisma.product.deleteMany({ where: { tenantId, id: { in: ids } } });
}

export async function findExistingProductStock(tenantId: string, warehouseId: string, productId: string) {
  return prisma.productWarehouseStock.findFirst({
    where: { tenantId, warehouseId, productId, variantId: null, batchId: null },
    select: { id: true },
  });
}

export async function updateProductStock(id: string, qty: number) {
  return prisma.productWarehouseStock.update({ where: { id }, data: { qty }, select: { id: true } });
}

export function getProductSelectFields() {
  return {
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      qrCode: true,
      sellingPrice: true,
      wholesalePrice: true,
      wholesaleDiscountPercent: true,
      wholesaleMinQty: true,
    } satisfies Prisma.ProductSelect,
  } as const;
}

export async function findProductByCode(tenantId: string, code: string) {
  return prisma.product.findFirst({
    where: {
      tenantId,
      isActive: true,
      OR: [{ sku: code }, { barcode: code }, { qrCode: code }],
    },
    select: getProductSelectFields().select,
  });
}

export async function findProductPriceRules(tenantId: string, productId: string, branchId: string | null) {
  return prisma.productPrice.findMany({
    where: {
      tenantId,
      productId,
      priceType: "RETAIL",
      isActive: true,
      ...(branchId ? { OR: [{ branchId }, { branchId: null }] } : { branchId: null }),
    },
    orderBy: [{ branchId: "desc" }, { startsAt: "desc" }, { updatedAt: "desc" }],
    take: 30,
    select: { price: true, startsAt: true, endsAt: true },
  }).catch(() => []);
}
