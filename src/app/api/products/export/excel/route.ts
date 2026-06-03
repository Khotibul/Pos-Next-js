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

type XlsxExportModule = {
  utils: {
    json_to_sheet: (data: Array<Record<string, unknown>>) => Record<string, unknown>;
    book_new: () => unknown;
    book_append_sheet: (workbook: unknown, sheet: Record<string, unknown>, name: string) => void;
  };
  write: (workbook: unknown, opts: { type: "buffer"; bookType: "xlsx" }) => Buffer | Uint8Array;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getXlsxExportModule(mod: unknown): XlsxExportModule {
  const candidate = isRecord(mod) && isRecord(mod.default) ? mod.default : mod;
  if (!isRecord(candidate) || !isRecord(candidate.utils) || typeof candidate.write !== "function") {
    throw new Error("Library Excel gagal dimuat. Silakan coba export CSV atau refresh halaman.");
  }

  const utils = candidate.utils;
  if (
    typeof utils.json_to_sheet !== "function" ||
    typeof utils.book_new !== "function" ||
    typeof utils.book_append_sheet !== "function"
  ) {
    throw new Error("Library Excel gagal dimuat. Silakan coba export CSV atau refresh halaman.");
  }

  return candidate as XlsxExportModule;
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

    const XLSX = getXlsxExportModule(await import("xlsx"));

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
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const body = Buffer.from(buf);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="products.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Gagal export produk Excel.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
