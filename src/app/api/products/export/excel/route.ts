import { NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { requireActiveTenant } from "@/lib/tenant-guards";
import { getProductsForExport } from "@/modules/products/export-service";

const querySchema = z.object({
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  supplierId: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  lowStock: z.enum(["1", "true", "yes"]).optional(),
  expired: z.enum(["expired", "7", "30", "90"]).optional(),
});

export async function GET(req: Request) {
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

  const { default: XLSX } = await import("xlsx");

  const json = rows.map((r) => ({
    SKU: r.sku,
    Barcode: r.barcode ?? "",
    "Nama Produk": r.name,
    Kategori: r.category,
    Brand: r.brand,
    Supplier: r.supplier,
    Unit: r.unit,
    "Harga Modal": r.purchasePrice,
    "Harga Jual": r.sellingPrice,
    Margin: r.marginPct,
    Stock: r.stock,
    "Minimum Stock": r.minimumStock,
    "Batch Number": r.batchNumber ?? "",
    "Expired Date": r.expiredDate ?? "",
    Status: r.status,
    "Updated At": r.updatedAt,
  }));

  const ws = XLSX.utils.json_to_sheet(json);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "products");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const u8 = Uint8Array.from(buf);
  const body = new Blob([u8], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="products.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
