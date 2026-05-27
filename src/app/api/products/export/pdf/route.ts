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

  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(12);
  doc.text("Products Export", 40, 36);

  const head = [
    [
      "SKU",
      "Barcode",
      "Nama",
      "Kategori",
      "Brand",
      "Supplier",
      "Unit",
      "Modal",
      "Jual",
      "Margin",
      "Stock",
      "Min",
      "Batch",
      "Expired",
      "Status",
      "Updated",
    ],
  ];

  const body = rows.map((r) => [
    r.sku,
    r.barcode ?? "",
    r.name,
    r.category,
    r.brand,
    r.supplier,
    r.unit,
    String(r.purchasePrice),
    String(r.sellingPrice),
    String(r.marginPct),
    String(r.stock),
    String(r.minimumStock),
    r.batchNumber ?? "",
    r.expiredDate ?? "",
    r.status,
    new Date(r.updatedAt).toLocaleString("id-ID"),
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 52,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [30, 64, 175] },
    theme: "grid",
  });

  const out = doc.output("arraybuffer");
  return new NextResponse(Buffer.from(out), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="products.pdf"',
      "Cache-Control": "no-store",
    },
  });
}

