import { prisma } from "@/lib/prisma";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { withApiHandler, apiOk } from "@/lib/api-response";

export const runtime = "nodejs";

type Params = { params: Promise<{ barcode: string }> };

// GET /api/mobile/products/barcode/:barcode — lookup produk by barcode/qr/sku
// Dipakai POS Android saat scan barcode (fallback saat produk belum ada di SQLite lokal).
export const GET = withApiHandler(async (req: Request, ctx: Params) => {
  const auth = await getMobileContext(req);
  const { barcode } = await ctx.params;
  const code = decodeURIComponent(barcode).trim();
  if (!code) {
    return Response.json(
      { ok: false, code: "VALIDATION_ERROR", message: "Barcode kosong." },
      { status: 400 },
    );
  }

  const p = await prisma.product.findFirst({
    where: {
      tenantId: auth.tenantId,
      OR: [
        { barcode: code },
        { qrCode: code },
        { sku: code },
        { variants: { some: { isActive: true, OR: [{ barcode: code }, { qrCode: code }, { sku: code }] } } },
      ],
    },
    include: {
      category: { select: { name: true } },
      brand: { select: { name: true } },
      supplier: { select: { name: true } },
      unit: { select: { name: true } },
      images: { orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }], select: { url: true } },
    },
  });

  if (!p) {
    return Response.json(
      { ok: false, code: "NOT_FOUND", message: `Produk dengan barcode ${code} tidak ditemukan` },
      { status: 404 },
    );
  }

  const agg = await prisma.productWarehouseStock.aggregate({
    where: { tenantId: auth.tenantId, productId: p.id },
    _sum: { qty: true },
  });

  const variants = await prisma.productVariant.findMany({
    where: { tenantId: auth.tenantId, productId: p.id, isActive: true },
    orderBy: [{ name: "asc" }],
    select: { id: true, sku: true, name: true, barcode: true, qrCode: true, sellingPrice: true },
  });
  const variantStock = variants.length
    ? await prisma.productWarehouseStock.groupBy({
        by: ["variantId"],
        where: { tenantId: auth.tenantId, productId: p.id, variantId: { in: variants.map((v) => v.id) } },
        _sum: { qty: true },
      })
    : [];
  const variantStockMap = new Map(variantStock.map((r) => [r.variantId, Number(r._sum?.qty ?? 0)]));
  const shapedVariants = variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    name: v.name,
    barcode: v.barcode,
    qrCode: v.qrCode,
    price: Number(v.sellingPrice),
    stock: variantStockMap.get(v.id) ?? 0,
  }));
  const matchedVariant = shapedVariants.find((v) =>
    [v.barcode, v.qrCode, v.sku].some((value) => value === code),
  );

  return apiOk({
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
    stock: Number(agg._sum?.qty ?? 0),
    variants: shapedVariants,
    matchedVariantId: matchedVariant?.id ?? null,
    imageUrl: p.images.length > 0 ? p.images[0].url : null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  });
});
