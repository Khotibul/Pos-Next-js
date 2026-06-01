"use client";

import { Badge } from "@/components/ui/badge";

export type ImportPreviewRow = {
  idx: number;
  ok: boolean;
  error?: string;
  data: {
    name?: string;
    sku?: string;
    barcode?: string | null;
    qrCode?: string | null;
    productType?: string;
    category?: string;
    brand?: string;
    supplier?: string;
    unit?: string;
    purchasePrice?: number;
    sellingPrice?: number;
    tax?: number;
    margin?: number;
    stock?: number;
    minimumStock?: number;
    reorderPoint?: number;
    weight?: number;
    volume?: number;
    expiredDate?: string | null;
    batchNumber?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    isActive?: boolean;
    isFeatured?: boolean;
    isConsignment?: boolean;
  };
};

export function ProductImportPreviewTable({ rows }: { rows: ImportPreviewRow[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-background">
      <table className="min-w-[900px] text-sm">
        <thead className="bg-muted/30">
          <tr className="text-left">
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">SKU</th>
            <th className="px-3 py-2">Produk</th>
            <th className="px-3 py-2">Barcode</th>
            <th className="px-3 py-2">QR</th>
            <th className="px-3 py-2">Tipe</th>
            <th className="px-3 py-2">Kategori</th>
            <th className="px-3 py-2">Brand</th>
            <th className="px-3 py-2">Supplier</th>
            <th className="px-3 py-2">Unit</th>
            <th className="px-3 py-2">Harga Modal</th>
            <th className="px-3 py-2">Harga Jual</th>
            <th className="px-3 py-2">Stok</th>
            <th className="px-3 py-2">Min</th>
            <th className="px-3 py-2">Batch</th>
            <th className="px-3 py-2">Expired</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={17} className="px-3 py-10 text-center text-muted-foreground">
                Belum ada data.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.idx} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">{r.idx + 1}</td>
                <td className="px-3 py-2">
                  {r.ok ? (
                    <Badge className="border-emerald-200 bg-emerald-100 text-emerald-900">OK</Badge>
                  ) : (
                    <Badge variant="destructive">Error</Badge>
                  )}
                  {!r.ok && r.error ? <div className="mt-1 text-xs text-destructive">{r.error}</div> : null}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{r.data.sku ?? "-"}</td>
                <td className="px-3 py-2 font-medium">{r.data.name ?? "-"}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.data.barcode ?? "-"}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.data.qrCode ?? "-"}</td>
                <td className="px-3 py-2 text-xs">{r.data.productType ?? "SINGLE"}</td>
                <td className="px-3 py-2">{r.data.category ?? "-"}</td>
                <td className="px-3 py-2">{r.data.brand ?? "-"}</td>
                <td className="px-3 py-2">{r.data.supplier ?? "-"}</td>
                <td className="px-3 py-2">{r.data.unit ?? "-"}</td>
                <td className="px-3 py-2">{r.data.purchasePrice ?? "-"}</td>
                <td className="px-3 py-2">{r.data.sellingPrice ?? "-"}</td>
                <td className="px-3 py-2">{r.data.stock ?? "-"}</td>
                <td className="px-3 py-2">{r.data.minimumStock ?? "-"}</td>
                <td className="px-3 py-2">{r.data.batchNumber ?? "-"}</td>
                <td className="px-3 py-2">{r.data.expiredDate ?? "-"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
