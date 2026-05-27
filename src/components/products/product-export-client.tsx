"use client";

import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { ProductExportButton } from "@/components/products/product-export-button";
import { Badge } from "@/components/ui/badge";

export function ProductExportClient({
  meta,
}: {
  meta: {
    categories: Array<{ id: string; name: string }>;
    brands: Array<{ id: string; name: string }>;
    units: Array<{ id: string; name: string }>;
    suppliers?: Array<{ id: string; name: string }>;
  };
}) {
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [status, setStatus] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [expired, setExpired] = useState("");

  const filters = useMemo(
    () => ({
      categoryId: categoryId || undefined,
      brandId: brandId || undefined,
      supplierId: supplierId || undefined,
      status: status || undefined,
      lowStock: lowStock || undefined,
      expired: expired || undefined,
    }),
    [brandId, categoryId, expired, lowStock, status, supplierId],
  );

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="grid gap-2">
          <Label>Kategori</Label>
          <select className="h-10 rounded-xl border bg-background px-3 text-sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Semua</option>
            {meta.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label>Brand</Label>
          <select className="h-10 rounded-xl border bg-background px-3 text-sm" value={brandId} onChange={(e) => setBrandId(e.target.value)}>
            <option value="">Semua</option>
            {meta.brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label>Supplier</Label>
          <select className="h-10 rounded-xl border bg-background px-3 text-sm" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Semua</option>
            {(meta.suppliers ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="grid gap-2">
          <Label>Status</Label>
          <select className="h-10 rounded-xl border bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Semua</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label>Expired Filter</Label>
          <select className="h-10 rounded-xl border bg-background px-3 text-sm" value={expired} onChange={(e) => setExpired(e.target.value)}>
            <option value="">-</option>
            <option value="expired">Sudah Expired</option>
            <option value="7">Expired 7 hari</option>
            <option value="30">Expired 30 hari</option>
            <option value="90">Expired 90 hari</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label>Stock Rendah</Label>
          <button
            type="button"
            onClick={() => setLowStock((v) => !v)}
            className="h-10 rounded-xl border bg-background px-3 text-left text-sm"
          >
            {lowStock ? <Badge className="bg-primary/10 text-primary">Aktif</Badge> : <span className="text-muted-foreground">Nonaktif</span>}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ProductExportButton format="csv" label="Export CSV" filters={filters} />
        <ProductExportButton format="excel" label="Export Excel" filters={filters} />
        <ProductExportButton format="pdf" label="Export PDF" filters={filters} />
      </div>
    </div>
  );
}

