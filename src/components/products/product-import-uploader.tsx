"use client";

import { useMemo, useState, useTransition } from "react";
import { Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ProductImportPreviewTable, type ImportPreviewRow } from "@/components/products/product-import-preview-table";
import { validateImportRows } from "@/modules/products/import-validator";

type ImportState =
  | { step: "idle" }
  | { step: "parsing" }
  | { step: "preview"; rows: ImportPreviewRow[] }
  | { step: "saving"; rows: ImportPreviewRow[] }
  | { step: "done"; message: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, "");
}

function toRecord(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[normalizeHeader(k)] = v;
  return out;
}

type XlsxModule = {
  read: (data: ArrayBuffer, opts: { type: "array"; cellDates?: boolean }) => { SheetNames: string[]; Sheets: Record<string, unknown> };
  utils: {
    sheet_to_json: (sheet: unknown, opts: { defval: string; raw?: boolean; dateNF?: string }) => Array<Record<string, unknown>>;
  };
};

function getXlsxModule(mod: unknown): XlsxModule {
  const candidate = isRecord(mod) && isRecord(mod.default) ? mod.default : mod;
  if (!isRecord(candidate)) {
    throw new Error("Library Excel gagal dimuat. Silakan refresh halaman lalu coba lagi.");
  }
  const read = candidate.read;
  const utils = candidate.utils;
  if (typeof read !== "function" || !isRecord(utils) || typeof utils.sheet_to_json !== "function") {
    throw new Error("Library Excel gagal dimuat. Silakan refresh halaman lalu coba lagi.");
  }
  return candidate as XlsxModule;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      row.push(current);
      current = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(current);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      current = "";
      continue;
    }
    current += char;
  }

  row.push(current);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);

  const [headers, ...body] = rows;
  if (!headers || headers.length === 0) return [];
  return body.map((cells) => {
    const item: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      item[header] = cells[index] ?? "";
    });
    return item;
  });
}

async function parseSpreadsheet(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") {
    return parseCsv(await file.text());
  }

  const XLSX = getXlsxModule(await import("xlsx"));
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("Sheet tidak ditemukan.");
  const ws = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(ws, { defval: "", raw: false, dateNF: "yyyy-mm-dd" }) as Array<Record<string, unknown>>;
}

export function ProductImportUploader() {
  const [state, setState] = useState<ImportState>({ step: "idle" });
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const previewRows = useMemo(() => {
    if (state.step === "preview" || state.step === "saving") return state.rows;
    return [];
  }, [state]);
  const okRows = useMemo(() => previewRows.filter((r) => r.ok).length, [previewRows]);
  const badRows = useMemo(() => previewRows.filter((r) => !r.ok).length, [previewRows]);

  async function parseFile(file: File) {
    setErr(null);
    setState({ step: "parsing" });

    const json = await parseSpreadsheet(file);
    if (json.length === 0) throw new Error("File tidak memiliki data produk.");
    const normalized = json.map(toRecord);

    // Map common headers to expected keys
    const mapped = normalized.map((r) => ({
      name: r["name"],
      sku: r["sku"],
      barcode: r["barcode"],
      qrCode: r["qrcode"] ?? r["qr_code"] ?? r["qr"],
      productType: r["producttype"] ?? r["product_type"] ?? r["type"],
      category: r["category"],
      brand: r["brand"],
      supplier: r["supplier"],
      unit: r["unit"],
      purchasePrice: r["purchaseprice"] ?? r["purchase_price"] ?? r["costprice"] ?? r["cost_price"],
      sellingPrice: r["sellingprice"] ?? r["selling_price"] ?? r["price"],
      stock: r["stock"],
      minimumStock: r["minimumstock"] ?? r["minimum_stock"] ?? r["minstock"] ?? r["min_stock"],
      reorderPoint: r["reorderpoint"] ?? r["reorder_point"],
      weight: r["weight"],
      volume: r["volume"],
      expiredDate: r["expireddate"] ?? r["expired_date"] ?? r["exp"] ?? r["expiry"],
      batchNumber: r["batchnumber"] ?? r["batch_number"] ?? r["batch"],
      description: r["description"],
      tax: r["tax"] ?? r["taxrate"] ?? r["tax_rate"],
      margin: r["margin"] ?? r["marginpct"] ?? r["margin_pct"],
      imageUrl: r["imageurl"] ?? r["image_url"],
      isActive: r["isactive"] ?? r["active"],
      isFeatured: r["isfeatured"] ?? r["featured"],
      isConsignment: r["isconsignment"] ?? r["is_consignment"] ?? r["consignment"],
    }));

    const validated = validateImportRows(mapped as Array<Record<string, unknown>>);
    const rows: ImportPreviewRow[] = validated.map((v, idx) => {
      if (v.ok) {
        return {
          idx,
          ok: true,
          data: {
            name: v.data.name,
            sku: v.data.sku,
            barcode: v.data.barcode,
            qrCode: v.data.qrCode,
            productType: v.data.productType,
            category: v.data.category,
            brand: v.data.brand,
            supplier: v.data.supplier,
            unit: v.data.unit,
            purchasePrice: v.data.purchasePrice,
            sellingPrice: v.data.sellingPrice,
            tax: v.data.tax ?? 0,
            margin: v.data.margin ?? 0,
            stock: v.data.stock,
            minimumStock: v.data.minimumStock,
            reorderPoint: v.data.reorderPoint,
            weight: v.data.weight,
            volume: v.data.volume,
            batchNumber: v.data.batchNumber,
            expiredDate: v.data.expiredDate ? v.data.expiredDate.toISOString().slice(0, 10) : null,
            description: v.data.description ?? null,
            imageUrl: v.data.imageUrl ?? null,
            isActive: v.data.isActive ?? true,
            isFeatured: v.data.isFeatured ?? false,
            isConsignment: v.data.isConsignment ?? false,
          },
        };
      }
      const raw = mapped[idx];
      return {
        idx,
        ok: false,
        error: v.error,
        data: {
          name: typeof raw.name === "string" ? raw.name : undefined,
          sku: typeof raw.sku === "string" ? raw.sku : undefined,
          barcode: typeof raw.barcode === "string" ? raw.barcode : raw.barcode == null ? null : String(raw.barcode),
          qrCode: typeof raw.qrCode === "string" ? raw.qrCode : raw.qrCode == null ? null : String(raw.qrCode),
          productType: typeof raw.productType === "string" ? raw.productType : "SINGLE",
          category: typeof raw.category === "string" ? raw.category : undefined,
          brand: typeof raw.brand === "string" ? raw.brand : undefined,
          supplier: typeof raw.supplier === "string" ? raw.supplier : undefined,
          unit: typeof raw.unit === "string" ? raw.unit : undefined,
          purchasePrice: typeof raw.purchasePrice === "number" ? raw.purchasePrice : Number(raw.purchasePrice),
          sellingPrice: typeof raw.sellingPrice === "number" ? raw.sellingPrice : Number(raw.sellingPrice),
          stock: typeof raw.stock === "number" ? raw.stock : Number(raw.stock),
          minimumStock: typeof raw.minimumStock === "number" ? raw.minimumStock : Number(raw.minimumStock),
          reorderPoint: typeof raw.reorderPoint === "number" ? raw.reorderPoint : Number(raw.reorderPoint),
          weight: typeof raw.weight === "number" ? raw.weight : Number(raw.weight),
          volume: typeof raw.volume === "number" ? raw.volume : Number(raw.volume),
          expiredDate: raw.expiredDate ? String(raw.expiredDate) : null,
          batchNumber: raw.batchNumber ? String(raw.batchNumber) : null,
        },
      };
    });

    setState({ step: "preview", rows });
  }

  async function saveImport(rows: ImportPreviewRow[]) {
    setErr(null);
    setState({ step: "saving", rows });

    const payloadRows = rows
      .filter((r) => r.ok)
      .map((r) => ({
        name: r.data.name,
        sku: r.data.sku,
        barcode: r.data.barcode ?? "",
        qrCode: r.data.qrCode ?? "",
        productType: r.data.productType ?? "SINGLE",
        category: r.data.category,
        brand: r.data.brand,
        supplier: r.data.supplier,
        unit: r.data.unit,
        purchasePrice: r.data.purchasePrice,
        sellingPrice: r.data.sellingPrice,
        stock: r.data.stock,
        minimumStock: r.data.minimumStock,
        reorderPoint: r.data.reorderPoint ?? r.data.minimumStock ?? 0,
        weight: r.data.weight ?? 0,
        volume: r.data.volume ?? 0,
        expiredDate: r.data.expiredDate ?? "",
        batchNumber: r.data.batchNumber ?? "",
        description: r.data.description ?? "",
        tax: r.data.tax ?? 0,
        margin: r.data.margin ?? 0,
        imageUrl: r.data.imageUrl ?? "",
        isActive: r.data.isActive ?? true,
        isFeatured: r.data.isFeatured ?? false,
        isConsignment: r.data.isConsignment ?? false,
      }));

    // Chunk client-side for basic progress
    const chunkSize = 250;
    let created = 0;
    let updated = 0;
    let failed = 0;

    for (let i = 0; i < payloadRows.length; i += chunkSize) {
      const chunk = payloadRows.slice(i, i + chunkSize);
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: chunk }),
      });
      const json = (await res.json().catch(() => null)) as unknown;
      const isOk = isRecord(json) && json.ok === true && isRecord(json.data);
      if (!res.ok || !isOk) {
        failed += chunk.length;
        setErr(isRecord(json) && typeof json.message === "string" ? json.message : "Gagal import sebagian data.");
        continue;
      }
      const data = json.data as Record<string, unknown>;
      created += Number(data.created ?? 0);
      updated += Number(data.updated ?? 0);
      failed += Array.isArray(data.errors) ? data.errors.length : 0;
    }

    setState({
      step: "done",
      message: `Import selesai. Created: ${created}, Updated: ${updated}, Error: ${failed}.`,
    });
  }

  return (
    <div className="grid gap-4">
      <Card className="rounded-3xl">
        <CardContent className="grid gap-3 p-4">
          {err ? <Alert variant="destructive">{err}</Alert> : null}
          {state.step === "done" ? <Alert>{state.message}</Alert> : null}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Import Produk</div>
              <div className="text-xs text-muted-foreground">Upload Excel/CSV, preview, lalu simpan.</div>
            </div>
            <Button asChild variant="outline" className="gap-2 rounded-xl">
              <a href="/api/products/template" download="product-import-template.xlsx">
                <Download className="h-4 w-4" />
                Download Template
              </a>
            </Button>
          </div>

          <div className="grid gap-2">
            <label className="grid cursor-pointer place-items-center rounded-2xl border border-dashed bg-muted/10 p-8 text-center">
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const f = e.currentTarget.files?.[0];
                  if (!f) return;
                  startTransition(async () => {
                    try {
                      await parseFile(f);
                    } catch (e2: unknown) {
                      setErr(e2 instanceof Error ? e2.message : "Gagal parsing file.");
                      setState({ step: "idle" });
                    }
                  });
                }}
              />
              <div className="grid gap-2 text-sm">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border bg-background">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
                <div className="font-medium">Klik untuk upload file</div>
                <div className="text-xs text-muted-foreground">Support .xlsx/.xls/.csv</div>
              </div>
            </label>
          </div>

          {state.step === "preview" || state.step === "saving" ? (
            <div className="flex items-center justify-between text-sm">
              <div className="text-muted-foreground">
                OK: <span className="font-medium text-foreground">{okRows}</span> • Error:{" "}
                <span className="font-medium text-destructive">{badRows}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  disabled={pending}
                  onClick={() => setState({ step: "idle" })}
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  className="rounded-xl"
                  disabled={pending || okRows === 0}
                  onClick={() => void saveImport(previewRows)}
                >
                  {state.step === "saving" ? "Menyimpan..." : "Simpan Import"}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {state.step === "preview" || state.step === "saving" ? <ProductImportPreviewTable rows={previewRows} /> : null}
    </div>
  );
}
