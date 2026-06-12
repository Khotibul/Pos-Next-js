import { NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { getTenantContext } from "@/lib/tenant-context";
import { findProductByCode } from "@/modules/products/service";
import { prisma } from "@/lib/prisma";
import { getCache, setCache } from "@/lib/redis";
import { createDevTimer } from "@/lib/perf";

export const runtime = "nodejs";

const QuerySchema = z.object({
  code: z.string().trim().min(1).max(200),
});

export async function GET(req: Request) {
  const endTotal = createDevTimer("product.barcodeLookup.total");
  const ctx = await getTenantContext();
  const allowed =
    ctx.isSuperAdmin ||
    ctx.permissions.includes(PERMISSIONS.sales_write) ||
    ctx.permissions.includes(PERMISSIONS.products_read) ||
    ctx.permissions.includes(PERMISSIONS.products_barcode_read);
  if (!allowed) {
    endTotal();
    return NextResponse.json({ ok: false, message: "Anda tidak punya izin." }, { status: 403 });
  }
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ code: url.searchParams.get("code") ?? "" });
  if (!parsed.success) {
    endTotal();
    return NextResponse.json({ ok: false, message: "Kode tidak valid." }, { status: 400 });
  }

  const endProduct = createDevTimer("product.barcodeLookup.product");
  const product = await findProductByCode({ tenantId: ctx.tenantId, branchId: ctx.branchId, code: parsed.data.code });
  endProduct();
  if (!product) {
    endTotal();
    return NextResponse.json({ ok: false, message: "Produk tidak ditemukan." }, { status: 404 });
  }

  const endStock = createDevTimer("product.barcodeLookup.stock");
  const stock = await prismaSafeStock(ctx.tenantId, product.id);
  endStock();
  endTotal();

  return NextResponse.json({
    ok: true,
    data: {
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        qrCode: product.qrCode,
        price: Number(product.sellingPrice),
        stock,
      },
    },
  });
}

async function prismaSafeStock(tenantId: string, productId: string) {
  const cacheKey = `stock:${tenantId}:${productId}`;
  const cached = await getCache<number>(cacheKey);
  if (cached !== null) return cached;

  const stock = await prisma.productWarehouseStock
    .aggregate({
      where: { tenantId, productId },
      _sum: { qty: true },
    })
    .catch(() => null);
  const result = Number(stock?._sum.qty ?? 0);
  await setCache(cacheKey, result, 30).catch(() => {});
  return result;
}
