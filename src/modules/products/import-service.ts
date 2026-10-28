import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import { invalidateProductCache } from "@/lib/cache";
import type { ImportRow } from "@/modules/products/import-validator";

const READ_CHUNK = 1000;
const WRITE_CHUNK = 200;
const UPDATE_BATCH = 100;

export type ImportResult = {
  created: number;
  updated: number;
  errors: Array<{ idx: number; message: string }>;
};

function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const set = new Set<string>();
  for (const value of values) {
    const trimmed = (value ?? "").trim();
    if (trimmed) set.add(trimmed);
  }
  return [...set];
}

function errorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code?: unknown }).code ?? "");
  }
  return undefined;
}

function errorMessage(error: unknown): string {
  const code = errorCode(error);
  if (code === "P2002") return "Data duplikat (SKU, barcode, atau QR sudah dipakai).";
  if (code === "P2003") return "Relasi data tidak valid (kategori/brand/supplier/satuan).";
  if (error instanceof Error) return error.message;
  return "Gagal import baris.";
}

type MetaMaps = {
  category: Map<string, string>;
  brand: Map<string, string>;
  unit: Map<string, string>;
  supplier: Map<string, string>;
};

async function loadMetaMaps(tenantId: string, rows: ImportRow[]): Promise<MetaMaps> {
  const category = new Map<string, string>();
  const brand = new Map<string, string>();
  const unit = new Map<string, string>();
  const supplier = new Map<string, string>();

  async function loadNamed(
    names: string[],
    findMany: (batch: string[]) => Promise<Array<{ id: string; name: string }>>,
    createMany: (batch: string[]) => Promise<unknown>,
    target: Map<string, string>,
  ) {
    for (const batch of chunkArray(names, READ_CHUNK)) {
      const found = await findMany(batch);
      for (const item of found) target.set(item.name, item.id);
      const missing = batch.filter((name) => !target.has(name));
      if (missing.length === 0) continue;
      await createMany(missing);
      const created = await findMany(missing);
      for (const item of created) target.set(item.name, item.id);
    }
  }

  await loadNamed(
    uniqueStrings(rows.map((r) => r.category)),
    (batch) => prisma.productCategory.findMany({ where: { tenantId, name: { in: batch } }, select: { id: true, name: true } }),
    (batch) => prisma.productCategory.createMany({ data: batch.map((name) => ({ tenantId, name })), skipDuplicates: true }),
    category,
  );
  await loadNamed(
    uniqueStrings(rows.map((r) => r.brand)),
    (batch) => prisma.productBrand.findMany({ where: { tenantId, name: { in: batch } }, select: { id: true, name: true } }),
    (batch) => prisma.productBrand.createMany({ data: batch.map((name) => ({ tenantId, name })), skipDuplicates: true }),
    brand,
  );
  await loadNamed(
    uniqueStrings(rows.map((r) => r.unit)),
    (batch) => prisma.productUnit.findMany({ where: { tenantId, name: { in: batch } }, select: { id: true, name: true } }),
    (batch) => prisma.productUnit.createMany({ data: batch.map((name) => ({ tenantId, name })), skipDuplicates: true }),
    unit,
  );
  await loadNamed(
    uniqueStrings(rows.map((r) => r.supplier)),
    (batch) => prisma.supplier.findMany({ where: { tenantId, name: { in: batch } }, select: { id: true, name: true } }),
    (batch) => prisma.supplier.createMany({ data: batch.map((name) => ({ tenantId, name, isActive: true })) }),
    supplier,
  );

  return { category, brand, unit, supplier };
}

async function ensureDefaultWarehouse(params: { tenantId: string; branchId: string }) {
  const existing = await prisma.warehouse.findFirst({
    where: { tenantId: params.tenantId, OR: [{ branchId: params.branchId }, { branchId: null }], isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, branchId: true },
  });
  if (existing) return existing.id;

  try {
    const created = await prisma.warehouse.create({
      data: { tenantId: params.tenantId, branchId: params.branchId, name: "Main Warehouse", type: "BRANCH", isActive: true },
      select: { id: true },
    });
    return created.id;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code === "P2002") {
      const again = await prisma.warehouse.findFirst({
        where: { tenantId: params.tenantId, OR: [{ branchId: params.branchId }, { branchId: null }], isActive: true },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (again) return again.id;
    }
    throw e;
  }
}

type ExistingIndex = {
  bySku: Map<string, string>;
  byBarcode: Map<string, string>;
  qrOwner: Map<string, string>;
};

async function loadExistingIndex(tenantId: string, rows: ImportRow[]): Promise<ExistingIndex> {
  const index: ExistingIndex = { bySku: new Map(), byBarcode: new Map(), qrOwner: new Map() };

  for (const batch of chunkArray(uniqueStrings(rows.map((r) => r.sku)), READ_CHUNK)) {
    const found = await prisma.product.findMany({
      where: { tenantId, sku: { in: batch } },
      select: { id: true, sku: true, barcode: true },
    });
    for (const product of found) {
      index.bySku.set(product.sku, product.id);
      if (product.barcode) index.byBarcode.set(product.barcode, product.id);
    }
  }

  const missingBarcodes = uniqueStrings(rows.map((r) => r.barcode)).filter((barcode) => !index.byBarcode.has(barcode));
  for (const batch of chunkArray(missingBarcodes, READ_CHUNK)) {
    const found = await prisma.product.findMany({
      where: { tenantId, barcode: { in: batch } },
      select: { id: true, barcode: true },
    });
    for (const product of found) {
      if (product.barcode) index.byBarcode.set(product.barcode, product.id);
    }
  }

  for (const batch of chunkArray(uniqueStrings(rows.map((r) => r.qrCode ?? r.barcode)), READ_CHUNK)) {
    const found = await prisma.product.findMany({
      where: { tenantId, qrCode: { in: batch } },
      select: { id: true, qrCode: true },
    });
    for (const product of found) {
      if (product.qrCode) index.qrOwner.set(product.qrCode, product.id);
    }
  }

  return index;
}

type ChunkResult = {
  created: number;
  updated: number;
};

async function importChunk(params: {
  tenantId: string;
  branchId: string;
  warehouseId: string;
  chunk: ImportRow[];
  offset: number;
  meta: MetaMaps;
  index: ExistingIndex;
  errors: ImportResult["errors"];
}): Promise<ChunkResult> {
  const { tenantId, branchId, warehouseId, chunk, offset, meta, index, errors } = params;

  type PendingCreate = {
    idx: number;
    id: string;
    create: Prisma.ProductCreateManyInput;
    update: Prisma.ProductCreateManyInput;
  };

  const creates: PendingCreate[] = [];
  const updates: Array<{ idx: number; id: string; data: Prisma.ProductCreateManyInput }> = [];
  const rowProduct = new Map<number, { id: string; row: ImportRow }>();

  for (let j = 0; j < chunk.length; j += 1) {
    const idx = offset + j;
    const row = chunk[j];

    const targetId = index.bySku.get(row.sku) ?? (row.barcode ? index.byBarcode.get(row.barcode) : undefined) ?? null;

    let qrCode = row.qrCode ?? row.barcode ?? null;
    if (qrCode) {
      const owner = index.qrOwner.get(qrCode);
      if (owner && owner !== targetId) qrCode = null;
    }

    const data: Prisma.ProductCreateManyInput = {
      tenantId,
      sku: row.sku,
      name: row.name,
      slug: null,
      description: row.description,
      barcode: row.barcode,
      qrCode,
      categoryId: meta.category.get(row.category) ?? null,
      brandId: meta.brand.get(row.brand) ?? null,
      supplierId: meta.supplier.get(row.supplier) ?? null,
      unitId: meta.unit.get(row.unit) ?? null,
      costPrice: row.purchasePrice,
      sellingPrice: row.sellingPrice,
      minStock: row.minimumStock,
      reorderPoint: row.reorderPoint ?? row.minimumStock,
      taxRate: row.tax ?? 0,
      marginPct: row.margin ?? 0,
      weight: row.weight ?? 0,
      volume: row.volume ?? 0,
      wholesalePrice: row.wholesalePrice ?? 0,
      wholesaleDiscountPercent: row.wholesaleDiscountPercent ?? 0,
      wholesaleMinQty: row.wholesaleMinQty ?? 0,
      isActive: row.isActive ?? true,
      isFeatured: row.isFeatured ?? false,
      isConsignment: row.isConsignment ?? false,
      type: row.productType,
    };

    if (targetId) {
      updates.push({ idx, id: targetId, data });
      rowProduct.set(idx, { id: targetId, row });
      index.bySku.set(row.sku, targetId);
      if (row.barcode) index.byBarcode.set(row.barcode, targetId);
    } else {
      const id = randomUUID();
      creates.push({ idx, id, create: { ...data, id }, update: data });
      rowProduct.set(idx, { id, row });
      index.bySku.set(row.sku, id);
      if (row.barcode) index.byBarcode.set(row.barcode, id);
    }
    if (qrCode) index.qrOwner.set(qrCode, rowProduct.get(idx)!.id);
  }

  let created = 0;
  let updated = 0;

  if (creates.length > 0) {
    try {
      await prisma.product.createMany({ data: creates.map((c) => c.create) });
      created += creates.length;
    } catch (e) {
      if (errorCode(e) !== "P2002") throw e;
      for (const item of creates) {
        try {
          await prisma.product.create({ data: item.create });
          created += 1;
        } catch (rowError) {
          if (errorCode(rowError) === "P2002") {
            const existing = await prisma.product
              .findFirst({
                where: {
                  tenantId,
                  OR: [{ sku: item.create.sku }, ...(item.create.barcode ? [{ barcode: item.create.barcode }] : [])],
                },
                select: { id: true },
              })
              .catch(() => null);
            if (existing) {
              try {
                await prisma.product.update({ where: { id: existing.id }, data: item.update });
                updated += 1;
                continue;
              } catch {
                // fall through to row error
              }
            }
          }
          errors.push({ idx: item.idx, message: errorMessage(rowError) });
        }
      }
    }
  }

  for (const batch of chunkArray(updates, UPDATE_BATCH)) {
    try {
      await prisma.$transaction(batch.map((item) => prisma.product.update({ where: { id: item.id }, data: item.data })));
      updated += batch.length;
    } catch {
      for (const item of batch) {
        try {
          await prisma.product.update({ where: { id: item.id }, data: item.data });
          updated += 1;
        } catch (rowError) {
          errors.push({ idx: item.idx, message: errorMessage(rowError) });
        }
      }
    }
  }

  const failed = new Set(errors.filter((e) => e.idx >= offset && e.idx < offset + chunk.length).map((e) => e.idx));
  const succeeded = [...rowProduct.entries()].filter(([idx]) => !failed.has(idx));

  const batchIdByRow = new Map<number, string>();
  try {
    const batchRows = succeeded.filter(([, value]) => value.row.batchNumber || value.row.expiredDate);
    if (batchRows.length > 0) {
      const existingBatches = await prisma.productBatch.findMany({
        where: { tenantId, productId: { in: uniqueStrings(batchRows.map(([, v]) => v.id)) } },
        select: { id: true, productId: true, batchNumber: true, quantity: true, expiredDate: true, costPrice: true },
      });
      const existingMap = new Map(existingBatches.map((b) => [`${b.productId}|${b.batchNumber ?? ""}`, b]));

      const createMap = new Map<string, Prisma.ProductBatchCreateManyInput>();
      const updateMap = new Map<string, { id: string; quantity: number; expiredDate: Date | null; costPrice: number }>();

      for (const [idx, value] of batchRows) {
        const key = `${value.id}|${value.row.batchNumber ?? ""}`;
        const found = existingMap.get(key);
        if (found) {
          batchIdByRow.set(idx, found.id);
          const sameExpiry = (found.expiredDate?.getTime() ?? null) === (value.row.expiredDate?.getTime() ?? null);
          const sameData =
            Number(found.quantity) === value.row.stock &&
            Number(found.costPrice) === value.row.purchasePrice &&
            sameExpiry;
          if (!sameData) {
            updateMap.set(found.id, {
              id: found.id,
              quantity: value.row.stock,
              expiredDate: value.row.expiredDate ?? null,
              costPrice: value.row.purchasePrice,
            });
          }
          continue;
        }
        const pending = createMap.get(key);
        const id = pending?.id ?? randomUUID();
        batchIdByRow.set(idx, id);
        if (!pending) {
          createMap.set(key, {
            id,
            tenantId,
            productId: value.id,
            branchId,
            warehouseId,
            batchNumber: value.row.batchNumber,
            expiredDate: value.row.expiredDate ?? null,
            quantity: value.row.stock,
            costPrice: value.row.purchasePrice,
            source: "IMPORT",
          });
        }
      }

      if (createMap.size > 0) await prisma.productBatch.createMany({ data: [...createMap.values()] });
      const batchUpdates = [...updateMap.values()];
      for (const batch of chunkArray(batchUpdates, UPDATE_BATCH)) {
        await prisma.$transaction(
          batch.map((item) =>
            prisma.productBatch.update({
              where: { id: item.id },
              data: { quantity: item.quantity, expiredDate: item.expiredDate, costPrice: item.costPrice },
            }),
          ),
        );
      }
    }
  } catch (e) {
    for (const [idx] of succeeded) {
      if (!batchIdByRow.has(idx) && (chunk[idx - offset].batchNumber || chunk[idx - offset].expiredDate)) {
        errors.push({ idx, message: `Gagal menyimpan batch: ${errorMessage(e)}` });
      }
    }
  }

  try {
    const stockRows = succeeded.filter(([idx]) => !failed.has(idx));
    if (stockRows.length > 0) {
      const existingStocks = await prisma.productWarehouseStock.findMany({
        where: { tenantId, warehouseId, productId: { in: uniqueStrings(stockRows.map(([, v]) => v.id)) }, variantId: null },
        select: { id: true, productId: true, batchId: true, qty: true },
      });
      const existingMap = new Map(existingStocks.map((s) => [`${s.productId}|${s.batchId ?? ""}`, s]));

      const createMap = new Map<string, Prisma.ProductWarehouseStockCreateManyInput>();
      const updateMap = new Map<string, { id: string; qty: number }>();

      for (const [idx, value] of stockRows) {
        const batchId = batchIdByRow.get(idx) ?? null;
        const key = `${value.id}|${batchId ?? ""}`;
        const found = existingMap.get(key);
        if (found) {
          if (Number(found.qty) !== value.row.stock) {
            updateMap.set(found.id, { id: found.id, qty: value.row.stock });
          }
        } else {
          createMap.set(key, { tenantId, warehouseId, productId: value.id, variantId: null, batchId, qty: value.row.stock });
        }
      }

      if (createMap.size > 0) await prisma.productWarehouseStock.createMany({ data: [...createMap.values()] });
      const stockUpdates = [...updateMap.values()];
      for (const batch of chunkArray(stockUpdates, UPDATE_BATCH)) {
        await prisma.$transaction(
          batch.map((item) => prisma.productWarehouseStock.update({ where: { id: item.id }, data: { qty: item.qty } })),
        );
      }
    }
  } catch (e) {
    for (const [idx] of succeeded) errors.push({ idx, message: `Gagal menyimpan stok: ${errorMessage(e)}` });
  }

  try {
    const imageRows = succeeded.filter(([, value]) => Boolean(value.row.imageUrl));
    if (imageRows.length > 0) {
      const existingImages = await prisma.productImage.findMany({
        where: {
          tenantId,
          productId: { in: uniqueStrings(imageRows.map(([, v]) => v.id)) },
          url: { in: uniqueStrings(imageRows.map(([, v]) => v.row.imageUrl)) },
        },
        select: { productId: true, url: true },
      });
      const existingKeys = new Set(existingImages.map((image) => `${image.productId}|${image.url}`));
      const createMap = new Map<string, Prisma.ProductImageCreateManyInput>();
      for (const [, value] of imageRows) {
        const url = value.row.imageUrl;
        if (!url) continue;
        const key = `${value.id}|${url}`;
        if (existingKeys.has(key) || createMap.has(key)) continue;
        createMap.set(key, { tenantId, productId: value.id, url, alt: value.row.name, sortOrder: 0 });
      }
      if (createMap.size > 0) await prisma.productImage.createMany({ data: [...createMap.values()] });
    }
  } catch {
    // gambar bersifat opsional, jangan gagalkan import
  }

  return { created, updated };
}

export async function importProducts(params: {
  tenantId: string;
  branchId: string;
  userId: string;
  rows: ImportRow[];
  chunkSize?: number;
  replace?: boolean;
}) {
  if (params.rows.length === 0) throw Errors.badRequest("Tidak ada data untuk diimport.");
  if (!params.branchId) throw Errors.badRequest("Branch tidak valid.");
  const branch = await prisma.branch.findFirst({ where: { id: params.branchId, tenantId: params.tenantId }, select: { id: true } });
  if (!branch) throw Errors.badRequest("Cabang tidak ditemukan.");

  if (params.replace) {
    await prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({ where: { tenantId: params.tenantId } });
      await tx.productWarehouseStock.deleteMany({ where: { tenantId: params.tenantId } });
      await tx.productBatch.deleteMany({ where: { tenantId: params.tenantId } });
      await tx.product.deleteMany({ where: { tenantId: params.tenantId } });
    });
  }

  const warehouseId = await ensureDefaultWarehouse({ tenantId: params.tenantId, branchId: params.branchId });
  const meta = await loadMetaMaps(params.tenantId, params.rows);
  const index = params.replace ? { bySku: new Map(), byBarcode: new Map(), qrOwner: new Map() } : await loadExistingIndex(params.tenantId, params.rows);

  const writeChunk = Math.min(500, Math.max(50, params.chunkSize ?? WRITE_CHUNK));
  const result: ImportResult = { created: 0, updated: 0, errors: [] };

  for (let offset = 0; offset < params.rows.length; offset += writeChunk) {
    const chunk = params.rows.slice(offset, offset + writeChunk);
    try {
      const partial = await importChunk({
        tenantId: params.tenantId,
        branchId: params.branchId,
        warehouseId,
        chunk,
        offset,
        meta,
        index,
        errors: result.errors,
      });
      result.created += partial.created;
      result.updated += partial.updated;
    } catch (e) {
      for (let j = 0; j < chunk.length; j += 1) {
        result.errors.push({ idx: offset + j, message: errorMessage(e) });
      }
    }
  }

  await invalidateProductCache(params.tenantId);
  return result;
}
