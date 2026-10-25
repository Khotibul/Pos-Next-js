"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 50;

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
  const [page, setPage] = useState(0);
  const [errorsOnly, setErrorsOnly] = useState(false);

  useEffect(() => {
    setPage(0);
  }, [rows]);

  const filtered = useMemo(() => (errorsOnly ? rows.filter((r) => !r.ok) : rows), [rows, errorsOnly]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const start = currentPage * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div>
          Menampilkan {filtered.length === 0 ? 0 : start + 1}-{Math.min(start + PAGE_SIZE, filtered.length)} dari{" "}
          {filtered.length} baris
        </div>
        <Button
          type="button"
          size="sm"
          variant={errorsOnly ? "destructive" : "outline"}
          className="rounded-xl"
          onClick={() => {
            setErrorsOnly((v) => !v);
            setPage(0);
          }}
        >
          {errorsOnly ? "Tampilkan semua" : "Hanya error"}
        </Button>
      </div>

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
            {visible.length === 0 ? (
              <tr>
                <td colSpan={17} className="px-3 py-10 text-center text-muted-foreground">
                  {errorsOnly ? "Tidak ada baris error." : "Belum ada data."}
                </td>
              </tr>
            ) : (
              visible.map((r) => (
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

      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-xl"
            disabled={currentPage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span>
            Halaman {currentPage + 1} / {totalPages}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-xl"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
