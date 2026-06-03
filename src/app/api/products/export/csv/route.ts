import { NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { requireActiveTenant } from "@/lib/tenant-guards";
import { getProductsForExport } from "@/modules/products/export-service";
import { isAppError } from "@/lib/errors";

const querySchema = z.object({
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  supplierId: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  lowStock: z.enum(["1", "true", "yes"]).optional(),
  expired: z.enum(["expired", "7", "30", "90"]).optional(),
});

function csvEscape(v: string) {
  const s = v.replaceAll('"', '""');
  return `"${s}"`;
}

export async function GET(req: Request) {
  try {
    await requirePermission(PERMISSIONS.products_export);
    const ctx = await requireActiveTenant();

    const url = new URL(req.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) return NextResponse.json({ message: "Query tidak valid." }, { status: 400 });

    const rows = await getProductsForExport({
      tenantId: ctx.tenantId,
      categoryId: parsed.data.categoryId || null,
      brandId: parsed.data.brandId || null,
      supplierId: parsed.data.supplierId || null,
      status: parsed.data.status ?? null,
      lowStock: Boolean(parsed.data.lowStock),
      expired: parsed.data.expired ?? null,
    });

    const header = [
      "SKU",
      "Barcode",
      "Nama Produk",
      "Kategori",
      "Brand",
      "Supplier",
      "Unit",
      "Harga Modal",
      "Harga Jual",
      "Margin",
      "Stock",
      "Minimum Stock",
      "Batch Number",
      "Expired Date",
      "Status",
      "Updated At",
    ];

    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [
          csvEscape(r.sku),
          csvEscape(r.barcode ?? ""),
          csvEscape(r.name),
          csvEscape(r.category),
          csvEscape(r.brand),
          csvEscape(r.supplier),
          csvEscape(r.unit),
          String(r.purchasePrice),
          String(r.sellingPrice),
          String(r.marginPct),
          String(r.stock),
          String(r.minimumStock),
          csvEscape(r.batchNumber ?? ""),
          csvEscape(r.expiredDate ?? ""),
          csvEscape(r.status),
          csvEscape(r.updatedAt),
        ].join(","),
      );
    }

    const body = lines.join("\n");
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="products.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Gagal export produk CSV.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
