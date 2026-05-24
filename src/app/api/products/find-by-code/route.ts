import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { findProductByCode } from "@/modules/products/service";

export const runtime = "nodejs";

const QuerySchema = z.object({
  code: z.string().trim().min(1).max(200),
});

export async function GET(req: Request) {
  const ctx = await requirePermission(PERMISSIONS.sales_write);
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ code: url.searchParams.get("code") ?? "" });
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Kode tidak valid." }, { status: 400 });

  const product = await findProductByCode({ tenantId: ctx.tenantId, branchId: ctx.branchId, code: parsed.data.code });
  if (!product) return NextResponse.json({ ok: false, message: "Produk tidak ditemukan." }, { status: 404 });

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
      },
    },
  });
}

