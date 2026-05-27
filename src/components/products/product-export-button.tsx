"use client";

import { useMemo } from "react";
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

  return (
    <Button asChild variant="outline" className="gap-2 rounded-xl">
      <a href={href}>
        <Download className="h-4 w-4" />
        {label}
      </a>
    </Button>
  );
}

