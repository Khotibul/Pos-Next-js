import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { withApiHandler, apiOk } from "@/lib/api-response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

function shapeProduct(p: {
  id: string;
  sku: string;
  slug: string | null;
  barcode: string | null;
  qrCode: string | null;
  name: string;
  description: string | null;
  categoryId: string | null;
  brandId: string | null;
  supplierId: string | null;
  unitId: string | null;
  costPrice: unknown;
  sellingPrice: unknown;
  marginPct: unknown;
  taxRate: unknown;
  weight: unknown;
  volume: unknown;
  minStock: unknown;
  reorderPoint: unknown;
  wholesalePrice: unknown;
  wholesaleDiscountPercent: unknown;
  wholesaleMinQty: number;
  isActive: boolean;
  isFeatured: boolean;
  isConsignment: boolean;
  type: string;
  createdAt: Date;
  updatedAt: Date;
  category?: { name: string } | null;
  brand?: { name: string } | null;
  supplier?: { name: string } | null;
  unit?: { name: string } | null;
  images?: { url: string }[];
  stock?: number;
  variants?: Array<{ id: string; sku: string; name: string; barcode: string | null; qrCode: string | null; price: number; stock: number }>;
}) {
  return {
    id: p.id,
    sku: p.sku,
    slug: p.slug,
    barcode: p.barcode,
    qrCode: p.qrCode,
    name: p.name,
    description: p.description,
    categoryId: p.categoryId,
    categoryName: p.category?.name ?? null,
    brandId: p.brandId,
    brandName: p.brand?.name ?? null,
    supplierId: p.supplierId,
    supplierName: p.supplier?.name ?? null,
    unitId: p.unitId,
    unit: p.unit?.name ?? null,
    costPrice: Number(p.costPrice),
    sellingPrice: Number(p.sellingPrice),
    marginPct: Number(p.marginPct),
    taxRate: Number(p.taxRate),
    weight: Number(p.weight),
    volume: Number(p.volume),
    minStock: Number(p.minStock),
    reorderPoint: Number(p.reorderPoint),
    wholesalePrice: Number(p.wholesalePrice),
    wholesaleDiscountPercent: Number(p.wholesaleDiscountPercent),
    wholesaleMinQty: p.wholesaleMinQty,
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    isConsignment: p.isConsignment,
    type: p.type,
    stock: p.stock ?? 0,
    variants: p.variants ?? [],
    imageUrl: p.images && p.images.length > 0 ? p.images[0].url : null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

const includeFull = {
  category: { select: { name: true } },
  brand: { select: { name: true } },
  supplier: { select: { name: true } },
  unit: { select: { name: true } },
  images: {
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
    select: { url: true },
  },
};

async function loadProduct(id: string, tenantId: string) {
  const p = await prisma.product.findFirst({
    where: { id, tenantId },
    include: includeFull,
  });
  if (!p) return null;
  const [agg, variants] = await Promise.all([
    prisma.productWarehouseStock.aggregate({
      where: { tenantId, productId: id },
      _sum: { qty: true },
    }),
    prisma.productVariant.findMany({
      where: { tenantId, productId: id, isActive: true },
      orderBy: [{ name: "asc" }],
      select: { id: true, sku: true, name: true, barcode: true, qrCode: true, sellingPrice: true },
    }),
  ]);
  const variantStock = variants.length
    ? await prisma.productWarehouseStock.groupBy({
        by: ["variantId"],
        where: { tenantId, productId: id, variantId: { in: variants.map((v) => v.id) } },
        _sum: { qty: true },
      })
    : [];
  const variantStockMap = new Map(variantStock.map((r) => [r.variantId, Number(r._sum?.qty ?? 0)]));
  return shapeProduct({
    ...p,
    stock: Number(agg._sum?.qty ?? 0),
    variants: variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      name: v.name,
      barcode: v.barcode,
      qrCode: v.qrCode,
      price: Number(v.sellingPrice),
      stock: variantStockMap.get(v.id) ?? 0,
    })),
  });
}

// GET /api/mobile/products/:id — detail produk
export const GET = withApiHandler(async (_req: Request, ctx: Params) => {
  const auth = await getMobileContext(_req);
  const { id } = await ctx.params;
  const product = await loadProduct(id, auth.tenantId);
  if (!product) {
    return Response.json(
      { ok: false, code: "NOT_FOUND", message: "Produk tidak ditemukan." },
      { status: 404 },
    );
  }
  return apiOk(product);
});

const productUpdateSchema = z.object({
  sku: z.string().min(1),
  slug: z.string().nullish(),
  name: z.string().min(1),
  description: z.string().nullish(),
  barcode: z.string().nullish(),
  qrCode: z.string().nullish(),
  categoryId: z.string().nullish(),
  brandId: z.string().nullish(),
  supplierId: z.string().nullish(),
  unitId: z.string().nullish(),
  costPrice: z.number().default(0),
  sellingPrice: z.number().default(0),
  marginPct: z.number().default(0),
  taxRate: z.number().default(0),
  weight: z.number().default(0),
  volume: z.number().default(0),
  minStock: z.number().default(0),
  reorderPoint: z.number().default(0),
  wholesalePrice: z.number().default(0),
  wholesaleDiscountPercent: z.number().default(0),
  wholesaleMinQty: z.number().int().default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isConsignment: z.boolean().default(false),
  type: z.string().default("SINGLE"),
});

// PUT /api/mobile/products/:id — update produk
export const PUT = withApiHandler(async (req: Request, ctx: Params) => {
  const auth = await getMobileContext(req);
  const { id } = await ctx.params;

  const existing = await prisma.product.findFirst({
    where: { id, tenantId: auth.tenantId },
    select: { id: true },
  });
  if (!existing) {
    return Response.json(
      { ok: false, code: "NOT_FOUND", message: "Produk tidak ditemukan." },
      { status: 404 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = productUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, code: "VALIDATION_ERROR", message: "Data produk tidak valid." },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const [cat, brand, sup, unit] = await Promise.all([
    d.categoryId ? prisma.productCategory.findFirst({ where: { id: d.categoryId, tenantId: auth.tenantId }, select: { id: true } }) : null,
    d.brandId ? prisma.productBrand.findFirst({ where: { id: d.brandId, tenantId: auth.tenantId }, select: { id: true } }) : null,
    d.supplierId ? prisma.supplier.findFirst({ where: { id: d.supplierId, tenantId: auth.tenantId }, select: { id: true } }) : null,
    d.unitId ? prisma.productUnit.findFirst({ where: { id: d.unitId, tenantId: auth.tenantId }, select: { id: true } }) : null,
  ]);

  const updated = await prisma.product.update({
    where: { id: existing.id },
    data: {
      sku: d.sku,
      slug: d.slug ?? null,
      name: d.name,
      description: d.description ?? null,
      barcode: d.barcode ?? null,
      qrCode: d.qrCode ?? null,
      categoryId: cat?.id ?? null,
      brandId: brand?.id ?? null,
      supplierId: sup?.id ?? null,
      unitId: unit?.id ?? null,
      costPrice: d.costPrice,
      sellingPrice: d.sellingPrice,
      marginPct: d.marginPct,
      taxRate: d.taxRate,
      weight: d.weight,
      volume: d.volume,
      minStock: d.minStock,
      reorderPoint: d.reorderPoint,
      wholesalePrice: d.wholesalePrice,
      wholesaleDiscountPercent: d.wholesaleDiscountPercent,
      wholesaleMinQty: d.wholesaleMinQty,
      isActive: d.isActive,
      isFeatured: d.isFeatured,
      isConsignment: d.isConsignment,
      type: d.type as never,
    },
  });

  const product = await loadProduct(updated.id, auth.tenantId);
  return apiOk(product ?? { id: updated.id, sku: updated.sku });
});

// DELETE /api/mobile/products/:id — hapus produk milik tenant
export const DELETE = withApiHandler(async (req: Request, ctx: Params) => {
  const auth = await getMobileContext(req);
  const { id } = await ctx.params;

  const existing = await prisma.product.findFirst({
    where: { id, tenantId: auth.tenantId },
    select: { id: true },
  });
  if (!existing) {
    return Response.json(
      { ok: false, code: "NOT_FOUND", message: "Produk tidak ditemukan." },
      { status: 404 },
    );
  }

  try {
    await prisma.product.delete({ where: { id } });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code === "P2003") {
      return Response.json(
        { ok: false, code: "IN_USE", message: "Produk masih dipakai di transaksi/stok. Nonaktifkan saja." },
        { status: 400 },
      );
    }
    throw e;
  }

  return apiOk({ id, deleted: true });
});
