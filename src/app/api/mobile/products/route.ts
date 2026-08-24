import { prisma } from "@/lib/prisma";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { withApiHandler, apiOk } from "@/lib/api-response";

export const runtime = "nodejs";

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
