import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { withApiHandler, apiOk } from "@/lib/api-response";

export const runtime = "nodejs";

const productUpsertSchema = z.object({
  id: z.string().min(1),
  sku: z.string().min(1),
  slug: z.string().nullish(),
  name: z.string().min(1),
  description: z.string().nullish(),
  barcode: z.string().nullish(),
  qrCode: z.string().nullish(),
  categoryId: z.string().nullish(),
  costPrice: z.number().default(0),
  sellingPrice: z.number().default(0),
  marginPct: z.number().default(0),
  taxRate: z.number().default(0),
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

// Upsert produk dari mobile (dibuat/diubah saat offline).
export const POST = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);
  const body = await req.json().catch(() => null);
  const parsed = productUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, code: "VALIDATION_ERROR", message: "Data produk tidak valid." },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const existing = await prisma.product.findFirst({
    where: { tenantId: ctx.tenantId, OR: [{ id: d.id }, { sku: d.sku }] },
    select: { id: true },
  });

  const data = {
    sku: d.sku,
    slug: d.slug ?? null,
    name: d.name,
    description: d.description ?? null,
    barcode: d.barcode ?? null,
    qrCode: d.qrCode ?? null,
    categoryId: d.categoryId ?? null,
    costPrice: d.costPrice,
    sellingPrice: d.sellingPrice,
    marginPct: d.marginPct,
    taxRate: d.taxRate,
    minStock: d.minStock,
    reorderPoint: d.reorderPoint,
    wholesalePrice: d.wholesalePrice,
    wholesaleDiscountPercent: d.wholesaleDiscountPercent,
    wholesaleMinQty: d.wholesaleMinQty,
    isActive: d.isActive,
    isFeatured: d.isFeatured,
    isConsignment: d.isConsignment,
    type: d.type as never,
  };

  const product = existing
    ? await prisma.product.update({ where: { id: existing.id }, data })
    : await prisma.product.create({
        data: { tenantId: ctx.tenantId, id: d.id, ...data },
      });

  return apiOk({ id: product.id, sku: product.sku });
});

export const GET = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);

  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.trim();
  const limitParam = Number(url.searchParams.get("limit") ?? "200");
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 200;

  const stockAgg = await prisma.productWarehouseStock.groupBy({
    by: ["productId"],
    where: { tenantId: ctx.tenantId },
    _sum: { qty: true },
  });
  const stockMap = new Map(stockAgg.map((r) => [r.productId, Number(r._sum?.qty ?? 0)]));

  const products = await prisma.product.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { sku: { contains: search, mode: "insensitive" } }, { barcode: { contains: search } }] } : {}),
    },
    include: {
      category: { select: { name: true } },
      images: { orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }], select: { url: true } },
    },
    orderBy: { name: "asc" },
    take: limit,
  });

  return apiOk(
    products.map((p) => ({
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
      supplierId: p.supplierId,
      unitId: p.unitId,
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
      stock: stockMap.get(p.id) ?? 0,
      imageUrl: p.images.length > 0 ? p.images[0].url : null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
  );
});
