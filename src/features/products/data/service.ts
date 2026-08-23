import "server-only";
import crypto from "node:crypto";

import { Errors } from "@/shared/server/errors/app-error";
import type { Prisma } from "@prisma/client";
import * as repo from "@/features/products/data/repository";
import { toProductListItem, toProductDetail, toFindProductByCodeResult } from "@/features/products/data/dto";
import type { ProductOverview, ProductDetail, ProductMeta, FindProductByCodeResult } from "@/features/products/domain/entity";
import type { CreateProductInput, UpdateProductInput } from "@/features/products/validators";
import { rememberCache, invalidateProductCache } from "@/shared/server/cache/index";

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
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
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { sku: { contains: q, mode: "insensitive" as const } }, { barcode: { contains: q, mode: "insensitive" as const } }] } : {}),
  };

  const [total, items] = await Promise.all([
    repo.countProducts(where),
    repo.findProducts(where, (page - 1) * pageSize, pageSize),
  ]);

  const productIds = items.map((p) => p.id);
  const stockAgg = await repo.getStockAggregate(params.tenantId, productIds);
  const stockMap = new Map(stockAgg.map((s) => [s.productId, Number(s._sum?.qty ?? 0)]));

  const { prisma: prismaForImages } = await import("@/shared/server/db/prisma");
  const imageRows = productIds.length
    ? await prismaForImages.productImage.findMany({
        where: { tenantId: params.tenantId, productId: { in: productIds } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { productId: true, url: true },
      })
    : [];
  const imageMap = new Map<string, string>();
  for (const r of imageRows) if (!imageMap.has(r.productId)) imageMap.set(r.productId, r.url);

  const mappedItems = items.map((p) => ({
    ...p,
    costPrice: Number(p.costPrice),
    sellingPrice: Number(p.sellingPrice),
    wholesalePrice: Number(p.wholesalePrice),
    wholesaleDiscountPercent: Number(p.wholesaleDiscountPercent),
  }));
  return {
    items: mappedItems.map((p) => toProductListItem({ ...p, imageUrl: imageMap.get(p.id) ?? null } as never, stockMap.get(p.id) ?? 0)),
    total, page, pageSize, q, categoryId, status,
  };
}

export async function getProductOverview(params: { tenantId: string }): Promise<ProductOverview> {
  return rememberCache({
    key: `product:overview:${params.tenantId}`,
    ttl: 60,
    fetcher: async () => {
      const [total, active, inactive, withBarcode] = await Promise.all([
        repo.countProducts({ tenantId: params.tenantId }),
        repo.countProducts({ tenantId: params.tenantId, isActive: true }),
        repo.countProducts({ tenantId: params.tenantId, isActive: false }),
        repo.countProducts({ tenantId: params.tenantId, barcode: { not: null } }),
      ]);
      return { total, active, inactive, withBarcode };
    },
  });
}

export async function getProductById(params: { tenantId: string; id: string }): Promise<ProductDetail> {
  const product = await repo.findProductById(params.tenantId, params.id);
  if (!product) throw Errors.notFound("Produk tidak ditemukan.");

  const stockAgg = await repo.getStockAggregate(params.tenantId, [product.id]);
  const totalStock = stockAgg.length ? Number(stockAgg[0]._sum?.qty ?? 0) : 0;

  return toProductDetail({ ...product, totalStock });
}

export async function createProduct(params: { tenantId: string; input: CreateProductInput }) {
  const desiredSku = (params.input.sku ?? "").trim();
  const desiredSlug = (params.input.slug ?? "").trim();
  const marginPct = typeof params.input.marginPct === "number" ? params.input.marginPct : computeMarginPct(params.input.costPrice, params.input.sellingPrice);

  const { prisma } = await import("@/shared/server/db/prisma");

  // Validasi FK milik tenant (mencegah P2003)
  const fkChecks: Promise<unknown>[] = [];
  if (params.input.categoryId) fkChecks.push(prisma.productCategory.findFirst({ where: { id: params.input.categoryId, tenantId: params.tenantId }, select: { id: true } }).then(r => { if (!r) throw Errors.badRequest("Kategori tidak ditemukan."); }));
  if (params.input.brandId) fkChecks.push(prisma.productBrand.findFirst({ where: { id: params.input.brandId, tenantId: params.tenantId }, select: { id: true } }).then(r => { if (!r) throw Errors.badRequest("Brand tidak ditemukan."); }));
  if (params.input.supplierId) fkChecks.push(prisma.supplier.findFirst({ where: { id: params.input.supplierId, tenantId: params.tenantId }, select: { id: true } }).then(r => { if (!r) throw Errors.badRequest("Supplier tidak ditemukan."); }));
  if (params.input.unitId) fkChecks.push(prisma.productUnit.findFirst({ where: { id: params.input.unitId, tenantId: params.tenantId }, select: { id: true } }).then(r => { if (!r) throw Errors.badRequest("Satuan tidak ditemukan."); }));
  if (fkChecks.length) await Promise.all(fkChecks);

  for (let attempt = 0; attempt < 3; attempt++) {
    const sku = desiredSku || genSku();
    try {
      const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
          let warehouse = await tx.warehouse.findFirst({ where: { tenantId: params.tenantId, isActive: true }, orderBy: { createdAt: "asc" }, select: { id: true } });
          if (!warehouse) {
            warehouse = await tx.warehouse.create({ data: { tenantId: params.tenantId, name: "Main Warehouse", type: "BRANCH", isActive: true }, select: { id: true } });
          }
          await tx.productWarehouseStock.create({
            data: { tenantId: params.tenantId, warehouseId: warehouse.id, productId: product.id, variantId: null, batchId: null, qty: initialStock },
            select: { id: true },
          });
        }

        const imageUrl = (params.input.imageUrl ?? "").trim();
        if (imageUrl) {
          await tx.productImage.create({
            data: { tenantId: params.tenantId, productId: product.id, url: imageUrl, alt: params.input.name, sortOrder: 0 },
            select: { id: true },
          });
        }

        return product;
      });

      await invalidateProductCache(params.tenantId).catch(() => {});
      return created;
    } catch (e: unknown) {
      const err = e as { code?: string; meta?: { target?: unknown } };
      if (err?.code === "P2002") {
        const target = Array.isArray(err.meta?.target) ? (err.meta.target as string[]).join(",") : String(err.meta?.target ?? "");
        if (!desiredSku && target.includes("sku")) continue;
        if (target.includes("sku")) throw Errors.badRequest("SKU sudah dipakai di tenant ini.");
        if (target.includes("qrCode")) throw Errors.badRequest("QR Code sudah dipakai.");
        if (target.includes("slug")) throw Errors.badRequest("Slug sudah dipakai.");
        throw Errors.badRequest("Data produk duplikat: " + target);
      }
      if (err?.code === "P2003") throw Errors.badRequest("Relasi kategori/brand/supplier/satuan tidak valid.");
      throw e;
    }
  }

  throw Errors.badRequest("Gagal membuat SKU otomatis. Silakan coba lagi.");
}

export async function updateProduct(params: { tenantId: string; id: string; input: UpdateProductInput }) {
  const { prisma } = await import("@/shared/server/db/prisma");
  const exists = await repo.findProductById(params.tenantId, params.id);
  if (!exists) throw Errors.notFound("Produk tidak ditemukan.");

  // Validasi FK bila diubah
  const fkChecks: Promise<unknown>[] = [];
  if (params.input.categoryId && params.input.categoryId !== "") fkChecks.push(prisma.productCategory.findFirst({ where: { id: params.input.categoryId, tenantId: params.tenantId }, select: { id: true } }).then(r => { if (!r) throw Errors.badRequest("Kategori tidak ditemukan."); }));
  if (params.input.brandId && params.input.brandId !== "") fkChecks.push(prisma.productBrand.findFirst({ where: { id: params.input.brandId, tenantId: params.tenantId }, select: { id: true } }).then(r => { if (!r) throw Errors.badRequest("Brand tidak ditemukan."); }));
  if (params.input.supplierId && params.input.supplierId !== "") fkChecks.push(prisma.supplier.findFirst({ where: { id: params.input.supplierId, tenantId: params.tenantId }, select: { id: true } }).then(r => { if (!r) throw Errors.badRequest("Supplier tidak ditemukan."); }));
  if (params.input.unitId && params.input.unitId !== "") fkChecks.push(prisma.productUnit.findFirst({ where: { id: params.input.unitId, tenantId: params.tenantId }, select: { id: true } }).then(r => { if (!r) throw Errors.badRequest("Satuan tidak ditemukan."); }));
  if (fkChecks.length) await Promise.all(fkChecks);

  try {
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
        let warehouse = await tx.warehouse.findFirst({ where: { tenantId: params.tenantId, isActive: true }, orderBy: { createdAt: "asc" }, select: { id: true } });
        if (!warehouse) {
          warehouse = await tx.warehouse.create({ data: { tenantId: params.tenantId, name: "Main Warehouse", type: "BRANCH", isActive: true }, select: { id: true } });
        }
        const existingStock = await tx.productWarehouseStock.findFirst({ where: { tenantId: params.tenantId, warehouseId: warehouse.id, productId: product.id, variantId: null, batchId: null }, select: { id: true } });
        if (existingStock) {
          await tx.productWarehouseStock.update({ where: { id: existingStock.id }, data: { qty: initialStock }, select: { id: true } });
        } else if (initialStock > 0) {
          await tx.productWarehouseStock.create({ data: { tenantId: params.tenantId, warehouseId: warehouse.id, productId: product.id, variantId: null, batchId: null, qty: initialStock }, select: { id: true } });
        }
      }

      if (params.input.imageUrl !== undefined) {
        const raw = (params.input.imageUrl ?? "").trim();
        if (raw === "") {
          await tx.productImage.deleteMany({ where: { tenantId: params.tenantId, productId: product.id } });
        } else if (raw) {
          const existingImg = await tx.productImage.findFirst({ where: { tenantId: params.tenantId, productId: product.id }, orderBy: { sortOrder: "asc" }, select: { id: true } });
          if (existingImg) {
            await tx.productImage.update({ where: { id: existingImg.id }, data: { url: raw } });
          } else {
            await tx.productImage.create({ data: { tenantId: params.tenantId, productId: product.id, url: raw, alt: params.input.name ?? exists.name, sortOrder: 0 } });
          }
        }
      }

      return product;
    });

    await invalidateProductCache(params.tenantId).catch(() => {});
    return updated;
  } catch (e: unknown) {
    const err = e as { code?: string; meta?: { target?: unknown } };
    if (err?.code === "P2002") {
      const target = Array.isArray(err.meta?.target) ? (err.meta.target as string[]).join(",") : String(err.meta?.target ?? "");
      if (target.includes("sku")) throw Errors.badRequest("SKU sudah dipakai di tenant ini.");
      if (target.includes("qrCode")) throw Errors.badRequest("QR Code sudah dipakai.");
      if (target.includes("slug")) throw Errors.badRequest("Slug sudah dipakai.");
      throw Errors.badRequest("Data produk duplikat: " + target);
    }
    if (err?.code === "P2003") throw Errors.badRequest("Relasi kategori/brand/supplier/satuan tidak valid.");
    throw e;
  }
}

export async function deleteProduct(params: { tenantId: string; id: string }) {
  const exists = await repo.findProductById(params.tenantId, params.id);
  if (!exists) throw Errors.notFound("Produk tidak ditemukan.");
  try {
    await repo.deleteProductById(params.id);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code === "P2003") throw Errors.badRequest("Produk masih dipakai di transaksi/stok. Nonaktifkan saja.");
    throw e;
  }
  await invalidateProductCache(params.tenantId).catch(() => {});
}

export async function deleteManyProducts(params: { tenantId: string; ids: string[] }) {
  if (!params.ids.length) return { count: 0 };
  try {
    const res = await repo.deleteManyProductsByIds(params.tenantId, params.ids);
    await invalidateProductCache(params.tenantId).catch(() => {});
    return res;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code === "P2003") throw Errors.badRequest("Beberapa produk masih dipakai. Nonaktifkan saja.");
    throw e;
  }
}

export async function listProductMeta(params: { tenantId: string }): Promise<ProductMeta> {
  const { prisma } = await import("@/shared/server/db/prisma");
  const [categories, brands, units, suppliers] = await Promise.all([
    prisma.productCategory.findMany({ where: { tenantId: params.tenantId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.productBrand.findMany({ where: { tenantId: params.tenantId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.productUnit.findMany({ where: { tenantId: params.tenantId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.supplier.findMany({ where: { tenantId: params.tenantId, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { categories, brands, units, suppliers };
}

export async function findProductByCode(params: { tenantId: string; branchId?: string | null; code: string }): Promise<FindProductByCodeResult | null> {
  const code = params.code.trim();
  if (!code) throw Errors.badRequest("Kode produk tidak valid.");

  const product = await repo.findProductByCode(params.tenantId, code);
  if (!product) return null;

  const at = new Date();
  const branchId = params.branchId ?? null;
  const rules = await repo.findProductPriceRules(params.tenantId, product.id, branchId);

  let override: number | null = null;
  for (const r of rules) {
    const withinStart = !r.startsAt || r.startsAt <= at;
    const withinEnd = !r.endsAt || r.endsAt >= at;
    if (withinStart && withinEnd) {
      override = Number(r.price);
      break;
    }
  }

  return toFindProductByCodeResult({
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    qrCode: product.qrCode,
    sellingPrice: override == null ? Number(product.sellingPrice) : override,
    wholesalePrice: Number(product.wholesalePrice),
    wholesaleDiscountPercent: Number(product.wholesaleDiscountPercent),
    wholesaleMinQty: product.wholesaleMinQty,
  });
}
