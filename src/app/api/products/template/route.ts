import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { isAppError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type XlsxModule = {
  utils: {
    json_to_sheet: (data: Array<Record<string, unknown>>, opts?: { header?: string[] }) => Record<string, unknown>;
    sheet_add_aoa: (sheet: Record<string, unknown>, data: string[][], opts?: { origin?: string }) => void;
    book_new: () => unknown;
    book_append_sheet: (workbook: unknown, sheet: Record<string, unknown>, name: string) => void;
    aoa_to_sheet: (data: string[][]) => Record<string, unknown>;
  };
  write: (workbook: unknown, opts: { type: "buffer"; bookType: "xlsx" }) => Buffer;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function getXlsxModule(mod: unknown): XlsxModule {
  const candidate = isRecord(mod) && isRecord(mod.default) ? mod.default : mod;
  if (!isRecord(candidate) || !isRecord(candidate.utils) || typeof candidate.write !== "function") {
    throw new Error("Library Excel gagal dimuat.");
  }
  const utils = candidate.utils;
  if (
    typeof utils.json_to_sheet !== "function" ||
    typeof utils.sheet_add_aoa !== "function" ||
    typeof utils.book_new !== "function" ||
    typeof utils.book_append_sheet !== "function" ||
    typeof utils.aoa_to_sheet !== "function"
  ) {
    throw new Error("Library Excel gagal dimuat.");
  }
  return candidate as XlsxModule;
}

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.products_import);

    const XLSX = getXlsxModule(await import("xlsx"));

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
        name: "Kopi Susu Aren 250ml",
        sku: "KSA-250ML",
        barcode: "899000000001",
        qrCode: "QR-KSA-250ML",
        productType: "SINGLE",
        category: "Minuman",
        brand: "PointPro",
        supplier: "Supplier Utama",
        unit: "PCS",
        purchasePrice: 10000,
        sellingPrice: 15000,
        stock: 24,
        minimumStock: 5,
        reorderPoint: 10,
        weight: 0.25,
        volume: 0,
        expiredDate: "2026-12-31",
        batchNumber: "BATCH-001",
        description: "Contoh produk import",
        tax: 11,
        margin: 0,
        imageUrl: "",
        isActive: true,
        isFeatured: false,
        isConsignment: false,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(example, { header: headers });
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A1" });
    ws["!cols"] = headers.map((header) => ({ wch: Math.max(14, header.length + 4) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "products");

    const guide = [
      ["Kolom", "Wajib", "Keterangan"],
      ["name", "Ya", "Nama produk"],
      ["sku", "Ya", "Unik per tenant; dipakai untuk update jika sudah ada"],
      ["barcode", "Tidak", "Unik per tenant jika diisi"],
      ["qrCode", "Tidak", "Jika kosong akan memakai barcode"],
      ["productType", "Tidak", "SINGLE, VARIANT, BUNDLE, SERVICE, DIGITAL, ASSEMBLY"],
      ["category", "Ya", "Otomatis dibuat jika belum ada"],
      ["brand", "Ya", "Otomatis dibuat jika belum ada"],
      ["supplier", "Ya", "Otomatis dibuat jika belum ada"],
      ["unit", "Ya", "Otomatis dibuat jika belum ada"],
      ["purchasePrice", "Ya", "Harga modal, angka tanpa titik/koma ribuan"],
      ["sellingPrice", "Ya", "Harga jual, angka tanpa titik/koma ribuan"],
      ["stock", "Ya", "Stok awal, tidak boleh negatif"],
      ["minimumStock", "Ya", "Minimum stok untuk alert"],
      ["reorderPoint", "Tidak", "Jika kosong memakai minimumStock"],
      ["weight/volume", "Tidak", "Angka desimal; gunakan titik untuk koma"],
      ["expiredDate", "Tidak", "Format YYYY-MM-DD disarankan"],
      ["batchNumber", "Tidak", "Jika diisi akan membuat ProductBatch"],
      ["isActive/isFeatured/isConsignment", "Tidak", "true/false, yes/no, 1/0"],
    ];
    const guideWs = XLSX.utils.aoa_to_sheet(guide);
    guideWs["!cols"] = [{ wch: 26 }, { wch: 10 }, { wch: 78 }];
    XLSX.utils.book_append_sheet(wb, guideWs, "panduan");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const body = new ArrayBuffer(buf.byteLength);
    new Uint8Array(body).set(buf);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="product-import-template.xlsx"',
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Gagal membuat template import produk.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
