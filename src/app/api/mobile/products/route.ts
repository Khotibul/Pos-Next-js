import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { withApiHandler, apiOk } from "@/lib/api-response";
import { requireCanUseDatabase } from "@/lib/plan-guard";

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

// Upsert produk dari mobile (dibuat/diubah saat offline). Paket free (starter) tidak boleh simpan ke DB.
export const POST = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);
  try {
    await requireCanUseDatabase(ctx.tenantId);
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.message === "PLAN_FREE_NO_DB") {
      return Response.json({ ok: false, code: "PLAN_FREE_NO_DB", message: "Paket Free tidak bisa simpan produk ke database. Upgrade ke Pro/Enterprise." }, { status: 403 });
    }
    throw e;
  }
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

  // Validasi FK: jika id tidak milik tenant, abaikan agar tidak gagal FK.
  let resolvedCategoryId: string | null = null;
  if (d.categoryId) {
    const cat = await prisma.productCategory.findFirst({ where: { id: d.categoryId, tenantId: ctx.tenantId }, select: { id: true } });
    resolvedCategoryId = cat?.id ?? null;
  }
  let resolvedBrandId: string | null = null;
  if (d.brandId) {
    const brand = await prisma.productBrand.findFirst({ where: { id: d.brandId, tenantId: ctx.tenantId }, select: { id: true } });
    resolvedBrandId = brand?.id ?? null;
  }
  let resolvedSupplierId: string | null = null;
  if (d.supplierId) {
    const sup = await prisma.supplier.findFirst({ where: { id: d.supplierId, tenantId: ctx.tenantId }, select: { id: true } });
    resolvedSupplierId = sup?.id ?? null;
  }
  let resolvedUnitId: string | null = null;
  if (d.unitId) {
    const unit = await prisma.productUnit.findFirst({ where: { id: d.unitId, tenantId: ctx.tenantId }, select: { id: true } });
    resolvedUnitId = unit?.id ?? null;
  }

  const data = {
    sku: d.sku,
    slug: d.slug ?? null,
    name: d.name,
    description: d.description ?? null,
    barcode: d.barcode ?? null,
    qrCode: d.qrCode ?? null,
    categoryId: resolvedCategoryId,
    brandId: resolvedBrandId,
    supplierId: resolvedSupplierId,
    unitId: resolvedUnitId,
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
  const categoryId = url.searchParams.get("category_id")?.trim();
  const pageParam = Number(url.searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const limitParam = Number(url.searchParams.get("limit") ?? "200");
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 1000) : 200;
  // Android default limit 20 + page → paginasi aktif. Tanpa page, kirim batch besar.
  const paginate = url.searchParams.has("page");
  const skip = paginate ? (page - 1) * limit : 0;

  const products = await prisma.product.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { sku: { contains: search, mode: "insensitive" } }, { barcode: { contains: search } }] } : {}),
      ...(categoryId ? { categoryId } : {}),
    },
    include: {
      category: { select: { name: true } },
      brand: { select: { name: true } },
      supplier: { select: { name: true } },
      unit: { select: { name: true } },
      images: { orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }], select: { url: true } },
    },
    // Urutan stabil (name + id) supaya paginasi tidak melewatkan/menduplikasi produk.
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: limit,
    ...(paginate ? { skip } : {}),
  });

  // Agregasi stok hanya untuk produk di halaman ini (hindari scan seluruh tenant).
  const productIds = products.map((p) => p.id);
  const stockAgg = productIds.length
    ? await prisma.productWarehouseStock.groupBy({
        by: ["productId"],
        where: { tenantId: ctx.tenantId, productId: { in: productIds } },
        _sum: { qty: true },
      })
    : [];
  const stockMap = new Map(stockAgg.map((r) => [r.productId, Number(r._sum?.qty ?? 0)]));

  const [variantRows, variantStockAgg] = productIds.length
    ? await Promise.all([
        prisma.productVariant.findMany({
          where: { tenantId: ctx.tenantId, productId: { in: productIds }, isActive: true },
          orderBy: [{ name: "asc" }],
          select: { id: true, productId: true, sku: true, name: true, barcode: true, qrCode: true, sellingPrice: true },
        }),
        prisma.productWarehouseStock.groupBy({
          by: ["variantId"],
          where: { tenantId: ctx.tenantId, productId: { in: productIds }, variantId: { not: null } },
          _sum: { qty: true },
        }),
      ])
    : [[], []];
  const variantStockMap = new Map(variantStockAgg.map((r) => [r.variantId, Number(r._sum?.qty ?? 0)]));
  const variantsByProduct = new Map<string, Array<{ id: string; sku: string; name: string; barcode: string | null; qrCode: string | null; price: number; stock: number }>>();
  for (const v of variantRows) {
    const arr = variantsByProduct.get(v.productId) ?? [];
    arr.push({
      id: v.id,
      sku: v.sku,
      name: v.name,
      barcode: v.barcode,
      qrCode: v.qrCode,
      price: Number(v.sellingPrice),
      stock: variantStockMap.get(v.id) ?? 0,
    });
    variantsByProduct.set(v.productId, arr);
  }

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
      stock: stockMap.get(p.id) ?? 0,
      variants: variantsByProduct.get(p.id) ?? [],
      imageUrl: p.images.length > 0 ? p.images[0].url : null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
  );
});
