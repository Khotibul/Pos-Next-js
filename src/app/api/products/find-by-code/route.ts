import { NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { getTenantContext } from "@/lib/tenant-context";
import { findProductByCode } from "@/modules/products/service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const QuerySchema = z.object({
  code: z.string().trim().min(1).max(200),
});

export async function GET(req: Request) {
  const ctx = await getTenantContext();
  const allowed =
    ctx.isSuperAdmin ||
    ctx.permissions.includes(PERMISSIONS.sales_write) ||
    ctx.permissions.includes(PERMISSIONS.products_read) ||
    ctx.permissions.includes(PERMISSIONS.products_barcode_read);
  if (!allowed) return NextResponse.json({ ok: false, message: "Anda tidak punya izin." }, { status: 403 });
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ code: url.searchParams.get("code") ?? "" });
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Kode tidak valid." }, { status: 400 });

  const product = await findProductByCode({ tenantId: ctx.tenantId, branchId: ctx.branchId, code: parsed.data.code });
  if (!product) return NextResponse.json({ ok: false, message: "Produk tidak ditemukan." }, { status: 404 });
  const stock = await prismaSafeStock(ctx.tenantId, product.id);

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
  const stock = await prisma.productWarehouseStock
    .aggregate({
      where: { tenantId, productId },
      _sum: { qty: true },
    })
    .catch(() => null);
  return Number(stock?._sum.qty ?? 0);
}
