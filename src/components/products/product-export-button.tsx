"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type ExportFormat = "csv" | "excel" | "pdf";

export function ProductExportButton({
  format,
  label,
  filters,
}: {
  format: ExportFormat;
  label: string;
  filters: { categoryId?: string; brandId?: string; supplierId?: string; status?: string; lowStock?: boolean; expired?: string };
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const href = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    if (filters.brandId) params.set("brandId", filters.brandId);
    if (filters.supplierId) params.set("supplierId", filters.supplierId);
    if (filters.status) params.set("status", filters.status);
    if (filters.lowStock) params.set("lowStock", "1");
    if (filters.expired) params.set("expired", filters.expired);
    const qs = params.toString();
    const path = format === "csv" ? "/api/products/export/csv" : format === "excel" ? "/api/products/export/excel" : "/api/products/export/pdf";
    return qs ? `${path}?${qs}` : path;
  }, [filters, format]);

  async function downloadExport() {
    setError(null);
    setIsDownloading(true);
    try {
      const response = await fetch(href, { cache: "no-store" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Export produk gagal diproses.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const match = /filename="?([^"]+)"?/i.exec(disposition);
      const fileName = match?.[1] ?? `products.${format === "excel" ? "xlsx" : format}`;
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Export produk gagal diproses.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="grid gap-1">
      <Button type="button" variant="outline" className="gap-2 rounded-xl" disabled={isDownloading} onClick={downloadExport}>
        <Download className="h-4 w-4" />
        {isDownloading ? "Memproses..." : label}
      </Button>
      {error ? <p className="max-w-56 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
