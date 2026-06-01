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
    "qrCode",
    "productType",
    "category",
    "brand",
    "supplier",
    "unit",
    "purchasePrice",
    "sellingPrice",
    "stock",
    "minimumStock",
    "reorderPoint",
    "weight",
    "volume",
    "expiredDate",
    "batchNumber",
    "description",
    "tax",
    "margin",
    "imageUrl",
    "isActive",
    "isFeatured",
    "isConsignment",
  ];

  const example = [
    {
      name: "Contoh Produk",
      sku: "SKU-0001",
      barcode: "899000000001",
      qrCode: "QR-SKU-0001",
      productType: "SINGLE",
      category: "Food",
      brand: "Generic",
      supplier: "Supplier A",
      unit: "pcs",
      purchasePrice: 10000,
      sellingPrice: 15000,
      stock: 24,
      minimumStock: 5,
      reorderPoint: 10,
      weight: 0.25,
      volume: 0,
      expiredDate: "2026-12-31",
      batchNumber: "BATCH-001",
      description: "Catatan produk (opsional)",
      tax: 11,
      margin: 0,
      imageUrl: "",
      isActive: true,
      isFeatured: false,
      isConsignment: false,
    },
  ];

  const ws = XLSX.utils.json_to_sheet(example, { header: headers });
  // Ensure column order even if empty
  XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A1" });
  ws["!cols"] = headers.map((header) => ({ wch: Math.max(12, header.length + 4) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "products");

  const guide = [
    ["Kolom", "Wajib", "Keterangan"],
    ["name", "Ya", "Nama produk"],
    ["sku", "Ya", "Unik per tenant; dipakai untuk update jika sudah ada"],
    ["barcode", "Tidak", "Unik per tenant jika diisi"],
    ["qrCode", "Tidak", "Jika kosong akan memakai barcode"],
    ["productType", "Tidak", "SINGLE, VARIANT, BUNDLE, SERVICE, DIGITAL, ASSEMBLY"],
    ["category/brand/supplier/unit", "Ya", "Otomatis dibuat jika belum ada"],
    ["purchasePrice/sellingPrice/stock/minimumStock", "Ya", "Tidak boleh negatif"],
    ["expiredDate", "Tidak", "Format YYYY-MM-DD disarankan"],
    ["batchNumber", "Tidak", "Jika diisi akan membuat ProductBatch"],
    ["isActive/isFeatured/isConsignment", "Tidak", "true/false, yes/no, 1/0"],
  ];
  const guideWs = XLSX.utils.aoa_to_sheet(guide);
  guideWs["!cols"] = [{ wch: 24 }, { wch: 10 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, guideWs, "panduan");

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
