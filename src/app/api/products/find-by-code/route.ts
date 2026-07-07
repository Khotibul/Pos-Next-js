import { withApiHandler, apiOk } from "@/lib/api-response";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { getTenantContext } from "@/lib/tenant-context";
import { findProductByCode } from "@/modules/products/service";
import { Errors } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getCache, setCache } from "@/lib/redis";
import { createDevTimer } from "@/lib/perf";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const QuerySchema = z.object({
  code: z.string().trim().min(1).max(200),
});

export const GET = withApiHandler(async (req: Request) => {
  const ctx = await getTenantContext();
  const allowed =
    ctx.isSuperAdmin ||
    ctx.permissions.includes(PERMISSIONS.sales_write) ||
    ctx.permissions.includes(PERMISSIONS.products_read) ||
    ctx.permissions.includes(PERMISSIONS.products_barcode_read);
  if (!allowed) throw Errors.forbidden("Anda tidak punya izin.");

  const rl = await checkRateLimit("barcodeScan", getClientIp(req));
  if (!rl.success) throw Errors.tooManyRequests("Terlalu banyak permintaan. Coba lagi nanti.");

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ code: url.searchParams.get("code") ?? "" });
  if (!parsed.success) throw Errors.badRequest("Kode tidak valid.");

  const endLookup = createDevTimer("findByCode.lookup");
  const productCacheKey = `product:code:${ctx.tenantId}:${parsed.data.code}`;
  let product: Awaited<ReturnType<typeof findProductByCode>> | null = await getCache(productCacheKey);
  if (!product) {
    product = await findProductByCode({ tenantId: ctx.tenantId, branchId: ctx.branchId, code: parsed.data.code });
    if (product) void setCache(productCacheKey, product, 60);
  }
  endLookup();
  if (!product) throw Errors.notFound("Produk tidak ditemukan.");

  const cacheKey = `stock:${ctx.tenantId}:${product.id}`;
  const cached = await getCache<number>(cacheKey);
  const stock = cached ?? await prisma.productWarehouseStock
    .aggregate({ where: { tenantId: ctx.tenantId, productId: product.id }, _sum: { qty: true } })
    .then((r) => Number(r._sum.qty ?? 0))
    .catch(() => 0);
  if (cached === null) void setCache(cacheKey, stock, 30);

  return apiOk({
    product: {
      id: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      qrCode: product.qrCode,
      price: Number(product.sellingPrice),
      stock,
      wholesalePrice: Number(product.wholesalePrice ?? 0),
      wholesaleDiscountPercent: Number(product.wholesaleDiscountPercent ?? 0),
      wholesaleMinQty: product.wholesaleMinQty ?? 0,
    },
  });
});
