import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";

export async function GET() {
  await requirePermission(PERMISSIONS.products_import);

  const { default: XLSX } = await import("xlsx");

  const headers = [
    "name",
    "sku",
    "barcode",
    "category",
    "brand",
    "supplier",
    "unit",
    "purchasePrice",
    "sellingPrice",
    "stock",
    "minimumStock",
    "expiredDate",
    "batchNumber",
    "description",
    "tax",
    "margin",
    "imageUrl",
    "isActive",
    "isFeatured",
  ];

  const example = [
    {
      name: "Contoh Produk",
      sku: "SKU-0001",
      barcode: "899000000001",
      category: "Food",
      brand: "Generic",
      supplier: "Supplier A",
      unit: "pcs",
      purchasePrice: 10000,
      sellingPrice: 15000,
      stock: 24,
      minimumStock: 5,
      expiredDate: "2026-12-31",
      batchNumber: "BATCH-001",
      description: "Catatan produk (opsional)",
      tax: 11,
      margin: 0,
      imageUrl: "",
      isActive: true,
      isFeatured: false,
    },
  ];

  const ws = XLSX.utils.json_to_sheet(example, { header: headers });
  // Ensure column order even if empty
  XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A1" });
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
      "Content-Disposition": 'attachment; filename="product-import-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
