import "server-only";

import { prisma } from "@/lib/prisma";

export type ProductExportFilter = {
  tenantId: string;
  categoryId?: string | null;
  brandId?: string | null;
  supplierId?: string | null;
  status?: "active" | "inactive" | null;
  lowStock?: boolean;
  expired?: "expired" | "7" | "30" | "90" | null;
};

function numberOrZero(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export type ProductExportRow = {
  sku: string;
  barcode: string | null;
  name: string;
  category: string;
  brand: string;
  supplier: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  marginPct: number;
  stock: number;
  minimumStock: number;
  batchNumber: string | null;
  expiredDate: string | null;
  status: string;
  updatedAt: string;
};

export async function getProductsForExport(filter: ProductExportFilter): Promise<ProductExportRow[]> {
  const where: Record<string, unknown> = {
    tenantId: filter.tenantId,
    ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
    ...(filter.brandId ? { brandId: filter.brandId } : {}),
    ...(filter.supplierId ? { supplierId: filter.supplierId } : {}),
    ...(filter.status === "active" ? { isActive: true } : filter.status === "inactive" ? { isActive: false } : {}),
  };

  const items = await prisma.product.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 5000,
    select: {
      id: true,
      sku: true,
      barcode: true,
      name: true,
      costPrice: true,
      sellingPrice: true,
      marginPct: true,
      minStock: true,
      isActive: true,
      updatedAt: true,
      category: { select: { name: true } },
      brand: { select: { name: true } },
      supplier: { select: { name: true } },
      unit: { select: { name: true } },
    },
  });

  const ids = items.map((p) => p.id);
  if (ids.length === 0) return [];

  const stockRows = await prisma.productWarehouseStock.groupBy({
    by: ["productId"],
    where: { tenantId: filter.tenantId, productId: { in: ids } },
    _sum: { qty: true },
  });
  const stockMap = new Map<string, number>();
  for (const r of stockRows) stockMap.set(r.productId, numberOrZero(r._sum.qty));

  const now = new Date();
  const expDays = filter.expired && filter.expired !== "expired" ? Number(filter.expired) : null;
  const expRangeEnd = expDays ? new Date(now.getTime() + expDays * 24 * 60 * 60 * 1000) : null;

  const nearestBatches = await prisma.productBatch.findMany({
    where: {
      tenantId: filter.tenantId,
      productId: { in: ids },
      AND: [
        {
          OR: [
            { expiredDate: { not: null } },
            { expiredAt: { not: null } },
            { batchNumber: { not: null } },
            { batchNo: { not: null } },
          ],
        },
        filter.expired === "expired"
          ? { OR: [{ expiredDate: { lt: now } }, { expiredAt: { lt: now } }] }
          : expRangeEnd
            ? {
                OR: [
                  { expiredDate: { gte: now, lte: expRangeEnd } },
                  { expiredAt: { gte: now, lte: expRangeEnd } },
                ],
              }
            : {},
      ],
    },
    orderBy: [{ expiredDate: "asc" }, { expiredAt: "asc" }, { createdAt: "desc" }],
    distinct: ["productId"],
    select: { productId: true, batchNumber: true, batchNo: true, expiredDate: true, expiredAt: true },
  });
  const batchMap = new Map<string, { batchNumber: string | null; expiredDate: string | null }>();
  for (const b of nearestBatches) {
    const bn = b.batchNumber ?? b.batchNo ?? null;
    const ed = (b.expiredDate ?? b.expiredAt) ? new Date(b.expiredDate ?? b.expiredAt!).toISOString().slice(0, 10) : null;
    batchMap.set(b.productId, { batchNumber: bn, expiredDate: ed });
  }

  const rows = items.map((p) => {
    const stock = stockMap.get(p.id) ?? 0;
    const min = numberOrZero(p.minStock);
    const batch = batchMap.get(p.id) ?? { batchNumber: null, expiredDate: null };
    return {
      sku: p.sku,
      barcode: p.barcode,
      name: p.name,
      category: p.category?.name ?? "-",
      brand: p.brand?.name ?? "-",
      supplier: p.supplier?.name ?? "-",
      unit: p.unit?.name ?? "-",
      purchasePrice: numberOrZero(p.costPrice),
      sellingPrice: numberOrZero(p.sellingPrice),
      marginPct: numberOrZero(p.marginPct),
      stock,
      minimumStock: min,
      batchNumber: batch.batchNumber,
      expiredDate: batch.expiredDate,
      status: p.isActive ? "Active" : "Inactive",
      updatedAt: p.updatedAt.toISOString(),
    } satisfies ProductExportRow;
  });

  const filtered =
    filter.lowStock
      ? rows.filter((r) => r.stock <= r.minimumStock)
      : rows;

  const expiredFiltered =
    filter.expired
      ? filtered.filter((r) => {
          if (!r.expiredDate) return false;
          const d = new Date(r.expiredDate);
          if (Number.isNaN(d.getTime())) return false;
          if (filter.expired === "expired") return d < now;
          const days = Number(filter.expired);
          const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
          return d >= now && d <= end;
        })
      : filtered;

  return expiredFiltered;
}
