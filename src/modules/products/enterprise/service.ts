import "server-only";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import type { Prisma } from "@prisma/client";
import type {
  CreateAdjustmentInput,
  CreateOpnameInput,
  CreateProductVariantInput,
  CreateTransferInput,
  CreateWarehouseInput,
  UpdateProductVariantInput,
  UpdateWarehouseInput,
} from "@/modules/products/enterprise/validators";

function genSku(prefix = "VAR") {
  const rand = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `${prefix}-${rand}`;
}

function numberOrZero(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeNullableId(v?: string | null) {
  const s = (v ?? "").trim();
  return s ? s : null;
}

async function stockIncrement(
  tx: Prisma.TransactionClient,
  params: { tenantId: string; warehouseId: string; productId: string; variantId: string | null; batchId: string | null; qtyDelta: number },
) {
  const where = {
    tenantId: params.tenantId,
    warehouseId: params.warehouseId,
    productId: params.productId,
    variantId: params.variantId,
    batchId: params.batchId,
  };

  const existing = await tx.productWarehouseStock.findFirst({ where, select: { id: true } });
  if (existing) {
    return tx.productWarehouseStock.update({
      where: { id: existing.id },
      data: { qty: { increment: params.qtyDelta } },
      select: { id: true },
    });
  }

  try {
    return await tx.productWarehouseStock.create({
      data: { ...where, qty: params.qtyDelta },
      select: { id: true },
    });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code !== "P2002") throw e;
    const again = await tx.productWarehouseStock.findFirst({ where, select: { id: true } });
    if (!again) throw e;
    return tx.productWarehouseStock.update({
      where: { id: again.id },
      data: { qty: { increment: params.qtyDelta } },
      select: { id: true },
    });
  }
}

async function stockSet(
  tx: Prisma.TransactionClient,
  params: { tenantId: string; warehouseId: string; productId: string; variantId: string | null; batchId: string | null; qty: number },
) {
  const where = {
    tenantId: params.tenantId,
    warehouseId: params.warehouseId,
    productId: params.productId,
    variantId: params.variantId,
    batchId: params.batchId,
  };

  const existing = await tx.productWarehouseStock.findFirst({ where, select: { id: true } });
  if (existing) {
    return tx.productWarehouseStock.update({
      where: { id: existing.id },
      data: { qty: params.qty },
      select: { id: true },
    });
  }

  try {
    return await tx.productWarehouseStock.create({
      data: { ...where, qty: params.qty },
      select: { id: true },
    });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code !== "P2002") throw e;
    const again = await tx.productWarehouseStock.findFirst({ where, select: { id: true } });
    if (!again) throw e;
    return tx.productWarehouseStock.update({
      where: { id: again.id },
      data: { qty: params.qty },
      select: { id: true },
    });
  }
}

export async function listWarehouses(params: { tenantId: string; branchId?: string | null }) {
  return prisma.warehouse.findMany({
    where: { tenantId: params.tenantId, ...(params.branchId ? { OR: [{ branchId: params.branchId }, { branchId: null }] } : {}) },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      isActive: true,
      branch: { select: { id: true, name: true } },
      updatedAt: true,
    },
  });
}

export async function createWarehouse(params: { tenantId: string; input: CreateWarehouseInput }) {
  const created = await prisma.warehouse.create({
    data: {
      tenantId: params.tenantId,
      name: params.input.name,
      type: params.input.type,
      branchId: normalizeNullableId(params.input.branchId),
      isActive: params.input.isActive ?? true,
    },
    select: { id: true },
  });
  return created;
}

export async function updateWarehouse(params: { tenantId: string; input: UpdateWarehouseInput }) {
  const exists = await prisma.warehouse.findFirst({ where: { tenantId: params.tenantId, id: params.input.id }, select: { id: true } });
  if (!exists) throw Errors.notFound("Gudang tidak ditemukan.");
  return prisma.warehouse.update({
    where: { id: params.input.id },
    data: {
      name: params.input.name,
      type: params.input.type,
      branchId: params.input.branchId === "" ? null : params.input.branchId,
      isActive: typeof params.input.isActive === "boolean" ? params.input.isActive : undefined,
    },
    select: { id: true },
  });
}

export async function deleteWarehouse(params: { tenantId: string; id: string }) {
  const exists = await prisma.warehouse.findFirst({ where: { tenantId: params.tenantId, id: params.id }, select: { id: true } });
  if (!exists) throw Errors.notFound("Gudang tidak ditemukan.");
  await prisma.warehouse.delete({ where: { id: params.id } });
}

export async function listProductVariants(params: { tenantId: string; productId: string }) {
  return prisma.productVariant.findMany({
    where: { tenantId: params.tenantId, productId: params.productId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      sku: true,
      name: true,
      barcode: true,
      qrCode: true,
      attributes: true,
      costPrice: true,
      sellingPrice: true,
      isActive: true,
      updatedAt: true,
    },
  });
}

export async function createProductVariant(params: { tenantId: string; input: CreateProductVariantInput }) {
  const product = await prisma.product.findFirst({
    where: { tenantId: params.tenantId, id: params.input.productId },
    select: { id: true },
  });
  if (!product) throw Errors.notFound("Produk tidak ditemukan.");

  const attributes: Record<string, string> = {};
  if (params.input.option1Name && params.input.option1Value) attributes[params.input.option1Name] = params.input.option1Value;
  if (params.input.option2Name && params.input.option2Value) attributes[params.input.option2Name] = params.input.option2Value;
  if (params.input.option3Name && params.input.option3Value) attributes[params.input.option3Name] = params.input.option3Value;

  const desiredSku = (params.input.sku ?? "").trim();

  for (let attempt = 0; attempt < 3; attempt++) {
    const sku = desiredSku || genSku("VAR");
    try {
      const created = await prisma.productVariant.create({
        data: {
          tenantId: params.tenantId,
          productId: params.input.productId,
          sku,
          name: params.input.name,
          barcode: params.input.barcode || null,
          qrCode: params.input.qrCode || null,
          attributes: Object.keys(attributes).length ? attributes : undefined,
          costPrice: params.input.costPrice ?? 0,
          sellingPrice: params.input.sellingPrice ?? 0,
          isActive: params.input.isActive ?? true,
        },
        select: { id: true },
      });
      return created;
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err?.code === "P2002" && !desiredSku) continue;
      throw e;
    }
  }
  throw Errors.badRequest("Gagal membuat SKU variant otomatis. Silakan coba lagi.");
}

export async function updateProductVariant(params: { tenantId: string; input: UpdateProductVariantInput }) {
  const exists = await prisma.productVariant.findFirst({ where: { tenantId: params.tenantId, id: params.input.id }, select: { id: true } });
  if (!exists) throw Errors.notFound("Variant tidak ditemukan.");

  const attributes: Record<string, string> = {};
  if (params.input.option1Name && params.input.option1Value) attributes[params.input.option1Name] = params.input.option1Value;
  if (params.input.option2Name && params.input.option2Value) attributes[params.input.option2Name] = params.input.option2Value;
  if (params.input.option3Name && params.input.option3Value) attributes[params.input.option3Name] = params.input.option3Value;

  return prisma.productVariant.update({
    where: { id: params.input.id },
    data: {
      sku: params.input.sku?.trim() || undefined,
      name: params.input.name,
      barcode: params.input.barcode === "" ? null : params.input.barcode,
      qrCode: params.input.qrCode === "" ? null : params.input.qrCode,
      attributes: Object.keys(attributes).length ? attributes : params.input.option1Name || params.input.option2Name || params.input.option3Name ? {} : undefined,
      costPrice: typeof params.input.costPrice === "number" ? params.input.costPrice : undefined,
      sellingPrice: typeof params.input.sellingPrice === "number" ? params.input.sellingPrice : undefined,
      isActive: typeof params.input.isActive === "boolean" ? params.input.isActive : undefined,
    },
    select: { id: true },
  });
}

export async function deleteProductVariant(params: { tenantId: string; id: string }) {
  const exists = await prisma.productVariant.findFirst({ where: { tenantId: params.tenantId, id: params.id }, select: { id: true } });
  if (!exists) throw Errors.notFound("Variant tidak ditemukan.");
  await prisma.productVariant.delete({ where: { id: params.id } });
}

async function assertWarehouse(params: { tenantId: string; warehouseId: string }) {
  const wh = await prisma.warehouse.findFirst({ where: { tenantId: params.tenantId, id: params.warehouseId, isActive: true }, select: { id: true } });
  if (!wh) throw Errors.badRequest("Gudang tidak ditemukan atau nonaktif.");
}

export async function createStockAdjustment(params: { tenantId: string; userId: string; input: CreateAdjustmentInput }) {
  await assertWarehouse({ tenantId: params.tenantId, warehouseId: params.input.warehouseId });

  const created = await prisma.$transaction(async (tx) => {
    const adj = await tx.productAdjustment.create({
      data: {
        tenantId: params.tenantId,
        warehouseId: params.input.warehouseId,
        status: "POSTED",
        reason: params.input.reason?.trim() || null,
        notes: params.input.notes?.trim() || null,
        createdById: params.userId,
      },
      select: { id: true, warehouseId: true },
    });

    for (const it of params.input.items) {
      const variantId = normalizeNullableId(it.variantId);
      const batchId = normalizeNullableId(it.batchId);
      const qtyDelta = numberOrZero(it.qtyDelta);
      if (!Number.isFinite(qtyDelta) || qtyDelta === 0) continue;

      await tx.productAdjustmentItem.create({
        data: {
          tenantId: params.tenantId,
          adjustmentId: adj.id,
          productId: it.productId,
          variantId,
          batchId,
          qtyDelta,
        },
        select: { id: true },
      });

      await stockIncrement(tx, {
        tenantId: params.tenantId,
        warehouseId: adj.warehouseId,
        productId: it.productId,
        variantId,
        batchId,
        qtyDelta,
      });
    }
    return adj;
  });

  return created;
}

export async function createStockTransfer(params: { tenantId: string; userId: string; input: CreateTransferInput }) {
  if (params.input.fromWarehouseId === params.input.toWarehouseId) throw Errors.badRequest("Gudang asal dan tujuan tidak boleh sama.");
  await assertWarehouse({ tenantId: params.tenantId, warehouseId: params.input.fromWarehouseId });
  await assertWarehouse({ tenantId: params.tenantId, warehouseId: params.input.toWarehouseId });

  const created = await prisma.$transaction(async (tx) => {
    const doc = await tx.productTransfer.create({
      data: {
        tenantId: params.tenantId,
        fromWarehouseId: params.input.fromWarehouseId,
        toWarehouseId: params.input.toWarehouseId,
        status: "POSTED",
        notes: params.input.notes?.trim() || null,
        createdById: params.userId,
      },
      select: { id: true, fromWarehouseId: true, toWarehouseId: true },
    });

    for (const it of params.input.items) {
      const variantId = normalizeNullableId(it.variantId);
      const batchId = normalizeNullableId(it.batchId);
      const qty = numberOrZero(it.qty);
      if (!Number.isFinite(qty) || qty <= 0) continue;

      await tx.productTransferItem.create({
        data: { tenantId: params.tenantId, transferId: doc.id, productId: it.productId, variantId, batchId, qty },
        select: { id: true },
      });

      // Decrement from source
      await stockIncrement(tx, {
        tenantId: params.tenantId,
        warehouseId: doc.fromWarehouseId,
        productId: it.productId,
        variantId,
        batchId,
        qtyDelta: -qty,
      });

      // Increment destination
      await stockIncrement(tx, {
        tenantId: params.tenantId,
        warehouseId: doc.toWarehouseId,
        productId: it.productId,
        variantId,
        batchId,
        qtyDelta: qty,
      });
    }
    return doc;
  });

  return created;
}

export async function createStockOpname(params: { tenantId: string; userId: string; input: CreateOpnameInput }) {
  await assertWarehouse({ tenantId: params.tenantId, warehouseId: params.input.warehouseId });

  const created = await prisma.$transaction(async (tx) => {
    const doc = await tx.productOpname.create({
      data: {
        tenantId: params.tenantId,
        warehouseId: params.input.warehouseId,
        status: "POSTED",
        notes: params.input.notes?.trim() || null,
        createdById: params.userId,
      },
      select: { id: true, warehouseId: true },
    });

    for (const it of params.input.items) {
      const variantId = normalizeNullableId(it.variantId);
      const batchId = normalizeNullableId(it.batchId);
      const countedQty = numberOrZero(it.countedQty);

      const existing = await tx.productWarehouseStock.findFirst({
        where: {
          tenantId: params.tenantId,
          warehouseId: doc.warehouseId,
          productId: it.productId,
          variantId,
          batchId,
        },
        select: { qty: true },
      });

      const systemQty = numberOrZero(existing?.qty);
      const difference = countedQty - systemQty;

      await tx.productOpnameItem.create({
        data: {
          tenantId: params.tenantId,
          opnameId: doc.id,
          productId: it.productId,
          variantId,
          batchId,
          systemQty,
          countedQty,
          difference,
        },
        select: { id: true },
      });

      await stockSet(tx, {
        tenantId: params.tenantId,
        warehouseId: doc.warehouseId,
        productId: it.productId,
        variantId,
        batchId,
        qty: countedQty,
      });
    }

    return doc;
  });

  return created;
}

export async function getProductEnterpriseDetail(params: { tenantId: string; id: string }) {
  const product = await prisma.product.findFirst({
    where: { tenantId: params.tenantId, id: params.id },
    select: {
      id: true,
      sku: true,
      name: true,
      slug: true,
      description: true,
      barcode: true,
      qrCode: true,
      type: true,
      isActive: true,
      isFeatured: true,
      isConsignment: true,
      costPrice: true,
      sellingPrice: true,
      marginPct: true,
      taxRate: true,
      minStock: true,
      reorderPoint: true,
      wholesalePrice: true,
      wholesaleDiscountPercent: true,
      wholesaleMinQty: true,
      category: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
      unit: { select: { id: true, name: true } },
      images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, url: true, alt: true } },
      updatedAt: true,
      createdAt: true,
    },
  });
  if (!product) throw Errors.notFound("Produk tidak ditemukan.");

  const [variants, stockRows] = await Promise.all([
    prisma.productVariant.findMany({
      where: { tenantId: params.tenantId, productId: product.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        sku: true,
        name: true,
        barcode: true,
        qrCode: true,
        attributes: true,
        costPrice: true,
        sellingPrice: true,
        isActive: true,
        updatedAt: true,
      },
    }),
    prisma.productWarehouseStock.groupBy({
      by: ["productId"],
      where: { tenantId: params.tenantId, productId: product.id },
      _sum: { qty: true },
    }),
  ]);

  const totalStock = stockRows.length ? numberOrZero(stockRows[0]?._sum?.qty) : 0;

  return { product, variants, totalStock };
}
