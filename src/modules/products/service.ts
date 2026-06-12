import "server-only";

import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import { rememberCache, invalidateProductCache } from "@/lib/cache";
import { CACHE_TTL, cacheKeys } from "@/lib/cache-keys";
import type { CreateProductInput, UpdateProductInput } from "@/modules/products/validators";
import crypto from "crypto";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function genSku() {
  const rand = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `SKU-${rand}`;
}

function computeMarginPct(cost: number, selling: number) {
  if (!Number.isFinite(cost) || !Number.isFinite(selling) || selling <= 0) return 0;
  const pct = ((selling - cost) / selling) * 100;
  return Math.max(0, Number.isFinite(pct) ? pct : 0);
}

export async function listProducts(params: {
  tenantId: string;
  q?: string | null;
  categoryId?: string | null;
  status?: "active" | "inactive" | null;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 20));
  const q = params.q?.trim() || null;
  const categoryId = params.categoryId?.trim() || null;
  const status = params.status ?? null;

  const where = {
    tenantId: params.tenantId,
    ...(categoryId ? { categoryId } : {}),
    ...(status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { sku: { contains: q } },
            { barcode: { contains: q } },
          ],
        }
      : {}),
  };

  return rememberCache({
    key: cacheKeys.productList(params.tenantId, null, { page, pageSize, q, categoryId, status }),
    ttl: CACHE_TTL.products,
    fetcher: async () => {
      const [total, items] = await prisma.$transaction([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
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
        }),
      ]);

      const productIds = items.map((p) => p.id);
      const stockAgg = productIds.length
        ? await prisma.productWarehouseStock.groupBy({
            by: ["productId"],
            where: { tenantId: params.tenantId, productId: { in: productIds } },
            _sum: { qty: true },
          })
        : [];
      const stockMap = new Map(stockAgg.map((s) => [s.productId, Number(s._sum?.qty ?? 0)]));
      const itemsWithStock = items.map((p) => ({
        ...p,
        stock: stockMap.get(p.id) ?? 0,
      }));

      return { items: itemsWithStock, total, page, pageSize, q, categoryId, status };
    },
  });
}

export async function getProductOverview(params: { tenantId: string }) {
  return rememberCache({
    key: `product:overview:${params.tenantId}`,
    ttl: CACHE_TTL.products,
    fetcher: async () => {
      const [total, active, inactive, withBarcode] = await prisma.$transaction([
        prisma.product.count({ where: { tenantId: params.tenantId } }),
        prisma.product.count({ where: { tenantId: params.tenantId, isActive: true } }),
        prisma.product.count({ where: { tenantId: params.tenantId, isActive: false } }),
        prisma.product.count({ where: { tenantId: params.tenantId, barcode: { not: null } } }),
      ]);
      return { total, active, inactive, withBarcode };
    },
  });
}

export async function getProductById(params: { tenantId: string; id: string }) {
  const product = await rememberCache({
    key: cacheKeys.productDetail(params.tenantId, params.id),
    ttl: CACHE_TTL.products,
    fetcher: () => prisma.product.findFirst({
      where: { tenantId: params.tenantId, id: params.id },
    }),
  });
  if (!product) throw Errors.notFound("Produk tidak ditemukan.");

  const stockAgg = await prisma.productWarehouseStock.groupBy({
    by: ["productId"],
    where: { tenantId: params.tenantId, productId: product.id },
    _sum: { qty: true },
  });
  const totalStock = stockAgg.length ? Number(stockAgg[0]._sum?.qty ?? 0) : 0;

  return { ...product, totalStock };
}

async function ensureDefaultWarehouse(tenantId: string) {
  const existing = await prisma.warehouse.findFirst({
    where: { tenantId, isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.warehouse.create({
    data: { tenantId, name: "Main Warehouse", type: "BRANCH", isActive: true },
    select: { id: true },
  });
  return created.id;
}

export async function createProduct(params: { tenantId: string; input: CreateProductInput }) {
  const desiredSku = (params.input.sku ?? "").trim();
  const desiredSlug = (params.input.slug ?? "").trim();
  const marginPct = typeof params.input.marginPct === "number" ? params.input.marginPct : computeMarginPct(params.input.costPrice, params.input.sellingPrice);

  // Generate SKU if not provided, retry on collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    const sku = desiredSku || genSku();
    try {
      const created = await prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            tenantId: params.tenantId,
            sku,
            name: params.input.name,
            slug: desiredSlug ? slugify(desiredSlug) : null,
            description: params.input.description?.trim() || null,
            barcode: params.input.barcode || null,
            qrCode: params.input.qrCode || null,
            categoryId: params.input.categoryId || null,
            brandId: params.input.brandId || null,
            supplierId: params.input.supplierId || null,
            unitId: params.input.unitId || null,
            costPrice: params.input.costPrice,
            sellingPrice: params.input.sellingPrice,
            marginPct,
            taxRate: params.input.taxRate ?? 0,
            weight: params.input.weight ?? 0,
            volume: params.input.volume ?? 0,
            minStock: params.input.minStock ?? 0,
            reorderPoint: params.input.reorderPoint ?? 0,
            wholesalePrice: params.input.wholesalePrice ?? 0,
            wholesaleDiscountPercent: params.input.wholesaleDiscountPercent ?? 0,
            wholesaleMinQty: params.input.wholesaleMinQty ?? 0,
            isActive: params.input.isActive ?? true,
            isFeatured: params.input.isFeatured ?? false,
            isConsignment: params.input.isConsignment ?? false,
            type: params.input.type ?? "SINGLE",
          },
          select: { id: true },
        });

        const initialStock = params.input.initialStock ?? 0;
        if (initialStock > 0) {
          const warehouseId = await ensureDefaultWarehouse(params.tenantId);
          await tx.productWarehouseStock.create({
            data: {
              tenantId: params.tenantId,
              warehouseId,
              productId: product.id,
              variantId: null,
              batchId: null,
              qty: initialStock,
            },
            select: { id: true },
          });
        }

        return product;
      });

      await invalidateProductCache(params.tenantId);
      return created;
    } catch (e: unknown) {
      // SKU unique collision
      const err = e as { code?: string };
      if (err?.code === "P2002" && !desiredSku) continue;
      throw e;
    }
  }

  throw Errors.badRequest("Gagal membuat SKU otomatis. Silakan coba lagi.");
}

export async function updateProduct(params: { tenantId: string; id: string; input: UpdateProductInput }) {
  const exists = await prisma.product.findFirst({
    where: { tenantId: params.tenantId, id: params.id },
    select: { id: true },
  });
  if (!exists) throw Errors.notFound("Produk tidak ditemukan.");

  const updated = await prisma.$transaction(async (tx) => {
    const product = await tx.product.update({
      where: { id: params.id },
      data: {
        sku: params.input.sku?.trim() || undefined,
        name: params.input.name,
        slug: params.input.slug === "" ? null : params.input.slug ? slugify(params.input.slug) : undefined,
        description: params.input.description === "" ? null : params.input.description,
        barcode: params.input.barcode === "" ? null : params.input.barcode,
        qrCode: params.input.qrCode === "" ? null : params.input.qrCode,
        categoryId: params.input.categoryId === "" ? null : params.input.categoryId,
        brandId: params.input.brandId === "" ? null : params.input.brandId,
        supplierId: params.input.supplierId === "" ? null : params.input.supplierId,
        unitId: params.input.unitId === "" ? null : params.input.unitId,
        costPrice: params.input.costPrice,
        sellingPrice: params.input.sellingPrice,
        marginPct: typeof params.input.marginPct === "number" ? params.input.marginPct : undefined,
        taxRate: typeof params.input.taxRate === "number" ? params.input.taxRate : undefined,
        weight: typeof params.input.weight === "number" ? params.input.weight : undefined,
        volume: typeof params.input.volume === "number" ? params.input.volume : undefined,
        minStock: typeof params.input.minStock === "number" ? params.input.minStock : undefined,
        reorderPoint: typeof params.input.reorderPoint === "number" ? params.input.reorderPoint : undefined,
        wholesalePrice: typeof params.input.wholesalePrice === "number" ? params.input.wholesalePrice : undefined,
        wholesaleDiscountPercent: typeof params.input.wholesaleDiscountPercent === "number" ? params.input.wholesaleDiscountPercent : undefined,
        wholesaleMinQty: typeof params.input.wholesaleMinQty === "number" ? params.input.wholesaleMinQty : undefined,
        isActive: typeof params.input.isActive === "boolean" ? params.input.isActive : undefined,
        isFeatured: typeof params.input.isFeatured === "boolean" ? params.input.isFeatured : undefined,
        isConsignment: typeof params.input.isConsignment === "boolean" ? params.input.isConsignment : undefined,
        type: params.input.type ?? undefined,
      },
      select: { id: true },
    });

    const initialStock = params.input.initialStock;
    if (typeof initialStock === "number" && initialStock >= 0) {
      const warehouseId = await ensureDefaultWarehouse(params.tenantId);
      const existingStock = await tx.productWarehouseStock.findFirst({
        where: { tenantId: params.tenantId, warehouseId, productId: product.id, variantId: null, batchId: null },
        select: { id: true },
      });
      if (existingStock) {
        await tx.productWarehouseStock.update({
          where: { id: existingStock.id },
          data: { qty: initialStock },
        });
      } else if (initialStock > 0) {
        await tx.productWarehouseStock.create({
          data: { tenantId: params.tenantId, warehouseId, productId: product.id, variantId: null, batchId: null, qty: initialStock },
          select: { id: true },
        });
      }
    }

    return product;
  });

  await invalidateProductCache(params.tenantId);
  return updated;
}

export async function deleteProduct(params: { tenantId: string; id: string }) {
  const exists = await prisma.product.findFirst({
    where: { tenantId: params.tenantId, id: params.id },
    select: { id: true },
  });
  if (!exists) throw Errors.notFound("Produk tidak ditemukan.");

  await prisma.product.delete({ where: { id: params.id } });
  await invalidateProductCache(params.tenantId);
}

export async function listProductMeta(params: { tenantId: string }) {
  const [categories, brands, units, suppliers] = await prisma.$transaction([
    prisma.productCategory.findMany({
      where: { tenantId: params.tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.productBrand.findMany({
      where: { tenantId: params.tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.productUnit.findMany({
      where: { tenantId: params.tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.supplier.findMany({
      where: { tenantId: params.tenantId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return { categories, brands, units, suppliers };
}

export async function findProductByCode(params: { tenantId: string; branchId?: string | null; code: string }) {
  const code = params.code.trim();
  if (!code) throw Errors.badRequest("Kode produk tidak valid.");

  return rememberCache({
    key: cacheKeys.productBarcode(params.tenantId, `${params.branchId ?? "all"}:${code}`),
    ttl: CACHE_TTL.products,
    fetcher: async () => {
      const product = await prisma.product.findFirst({
        where: {
          tenantId: params.tenantId,
          isActive: true,
          OR: [{ sku: code }, { barcode: code }, { qrCode: code }],
        },
        select: { id: true, name: true, sku: true, barcode: true, qrCode: true, sellingPrice: true, wholesalePrice: true, wholesaleDiscountPercent: true, wholesaleMinQty: true },
      });
      if (!product) return null;

      // Branch-scoped retail price override (promo period / happy hour via startsAt/endsAt datetime)
      const at = new Date();
      const branchId = params.branchId ?? null;
      const rules = await prisma.productPrice.findMany({
        where: {
          tenantId: params.tenantId,
          productId: product.id,
          priceType: "RETAIL",
          isActive: true,
          ...(branchId ? { OR: [{ branchId }, { branchId: null }] } : { branchId: null }),
        },
        orderBy: [{ branchId: "desc" }, { startsAt: "desc" }, { updatedAt: "desc" }],
        take: 30,
        select: { price: true, startsAt: true, endsAt: true },
      }).catch(() => []);

      let override: number | null = null;
      for (const r of rules) {
        const withinStart = !r.startsAt || r.startsAt <= at;
        const withinEnd = !r.endsAt || r.endsAt >= at;
        if (withinStart && withinEnd) {
          override = Number(r.price);
          break;
        }
      }

      return {
        ...product,
        sellingPrice: override == null ? Number(product.sellingPrice) : override,
        wholesalePrice: Number(product.wholesalePrice),
        wholesaleDiscountPercent: Number(product.wholesaleDiscountPercent),
        wholesaleMinQty: product.wholesaleMinQty,
      };
    },
  });
}
