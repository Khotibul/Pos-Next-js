import "server-only";

import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import { invalidateProductCache } from "@/lib/cache";
import type { ImportRow } from "@/modules/products/import-validator";

async function getOrCreateMeta(params: { tenantId: string; category: string; brand: string; unit: string; supplier: string }) {
  const [cat, brand, unit] = await prisma.$transaction([
    prisma.productCategory.upsert({
      where: { tenantId_name: { tenantId: params.tenantId, name: params.category } },
      update: {},
      create: { tenantId: params.tenantId, name: params.category },
      select: { id: true },
    }),
    prisma.productBrand.upsert({
      where: { tenantId_name: { tenantId: params.tenantId, name: params.brand } },
      update: {},
      create: { tenantId: params.tenantId, name: params.brand },
      select: { id: true },
    }),
    prisma.productUnit.upsert({
      where: { tenantId_name: { tenantId: params.tenantId, name: params.unit } },
      update: {},
      create: { tenantId: params.tenantId, name: params.unit },
      select: { id: true },
    }),
  ]);

  let supplier = await prisma.supplier.findFirst({
    where: { tenantId: params.tenantId, name: params.supplier },
    select: { id: true },
  });
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: { tenantId: params.tenantId, name: params.supplier, isActive: true },
      select: { id: true },
    });
  }

  return { categoryId: cat.id, brandId: brand.id, unitId: unit.id, supplierId: supplier.id };
}

async function ensureDefaultWarehouse(params: { tenantId: string; branchId: string }) {
  const existing = await prisma.warehouse.findFirst({
    where: { tenantId: params.tenantId, OR: [{ branchId: params.branchId }, { branchId: null }], isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, branchId: true },
  });
  if (existing) return existing.id;

  const created = await prisma.warehouse.create({
    data: { tenantId: params.tenantId, branchId: params.branchId, name: "Main Warehouse", type: "BRANCH", isActive: true },
    select: { id: true },
  });
  return created.id;
}

async function upsertStock(params: {
  tenantId: string;
  warehouseId: string;
  productId: string;
  batchId: string | null;
  qty: number;
}) {
  const where = {
    tenantId: params.tenantId,
    warehouseId: params.warehouseId,
    productId: params.productId,
    variantId: null as string | null,
    batchId: params.batchId,
  };

  const existing = await prisma.productWarehouseStock.findFirst({ where, select: { id: true } });
  if (existing) {
    return prisma.productWarehouseStock.update({ where: { id: existing.id }, data: { qty: params.qty }, select: { id: true } });
  }
  try {
    return await prisma.productWarehouseStock.create({ data: { ...where, qty: params.qty }, select: { id: true } });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code !== "P2002") throw e;
    const again = await prisma.productWarehouseStock.findFirst({ where, select: { id: true } });
    if (!again) throw e;
    return prisma.productWarehouseStock.update({ where: { id: again.id }, data: { qty: params.qty }, select: { id: true } });
  }
}

export type ImportResult = {
  created: number;
  updated: number;
  errors: Array<{ idx: number; message: string }>;
};

export async function importProducts(params: {
  tenantId: string;
  branchId: string;
  userId: string;
  rows: ImportRow[];
  chunkSize?: number;
}) {
  const chunkSize = Math.min(50, Math.max(5, params.chunkSize ?? 20));
  if (params.rows.length === 0) throw Errors.badRequest("Tidak ada data untuk diimport.");

  const warehouseId = await ensureDefaultWarehouse({ tenantId: params.tenantId, branchId: params.branchId });

  let created = 0;
  let updated = 0;
  const errors: ImportResult["errors"] = [];

  for (let i = 0; i < params.rows.length; i += chunkSize) {
    const chunk = params.rows.slice(i, i + chunkSize);
    for (let j = 0; j < chunk.length; j++) {
      const rowIndex = i + j;
      const r = chunk[j];

      try {
        // Meta per row (auto-create if missing)
        const meta = await getOrCreateMeta({
          tenantId: params.tenantId,
          category: r.category,
          brand: r.brand,
          unit: r.unit,
          supplier: r.supplier,
        });

        const existing = await prisma.product.findFirst({
          where: {
            tenantId: params.tenantId,
            OR: [{ sku: r.sku }, ...(r.barcode ? [{ barcode: r.barcode }] : [])],
          },
          select: { id: true },
        });

        const data = {
          tenantId: params.tenantId,
          sku: r.sku,
          name: r.name,
          slug: null as string | null,
          description: r.description,
          barcode: r.barcode,
          qrCode: r.barcode, // default
          categoryId: meta.categoryId,
          brandId: meta.brandId,
          supplierId: meta.supplierId,
          unitId: meta.unitId,
          costPrice: r.purchasePrice,
          sellingPrice: r.sellingPrice,
          minStock: r.minimumStock,
          reorderPoint: r.minimumStock,
          taxRate: r.tax ?? 0,
          marginPct: r.margin ?? 0,
          isActive: r.isActive ?? true,
          isFeatured: r.isFeatured ?? false,
        };

        let productId: string;
        if (!existing) {
          const createdProduct = await prisma.product.create({ data, select: { id: true } });
          productId = createdProduct.id;
          created += 1;
        } else {
          await prisma.product.update({ where: { id: existing.id }, data, select: { id: true } });
          productId = existing.id;
          updated += 1;
        }

        // ImageUrl (external URL only)
        if (r.imageUrl) {
          await prisma.productImage
            .create({
              data: { tenantId: params.tenantId, productId, url: r.imageUrl, alt: r.name, sortOrder: 0 },
              select: { id: true },
            })
            .catch(() => {});
        }

        // Batch/expired
        let batchId: string | null = null;
        if (r.batchNumber || r.expiredDate) {
          const batch = await prisma.productBatch.create({
            data: {
              tenantId: params.tenantId,
              productId,
              branchId: params.branchId,
              warehouseId,
              batchNumber: r.batchNumber,
              expiredDate: r.expiredDate,
              quantity: r.stock,
              costPrice: r.purchasePrice,
              source: "IMPORT",
            },
            select: { id: true },
          });
          batchId = batch.id;
        }

        // Stock (simple set, single warehouse)
        await upsertStock({ tenantId: params.tenantId, warehouseId, productId, batchId, qty: r.stock });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Gagal import baris.";
        errors.push({ idx: rowIndex, message: msg });
      }
    }
  }

  await invalidateProductCache(params.tenantId);
  return { created, updated, errors } satisfies ImportResult;
}
