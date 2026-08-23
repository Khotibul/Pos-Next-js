"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteProductButton } from "@/modules/products/components/delete-product-button";
import { deleteManyProductsAction } from "@/modules/products/actions";
import { Code128Mark } from "@/components/barcode/code128-mark";

type Item = {
  id: string;
  sku: string;
  name: string;
  barcode: string | null;
  categoryName: string;
  sellingPrice: unknown;
  stock: number;
  isActive: boolean;
  updatedAt: string;
  imageUrl?: string | null;
};

function formatRupiah(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
}

export function ProductsTable({
  items,
  categories,
  query,
}: {
  items: Item[];
  categories: Array<{ id: string; name: string }>;
  query: { q: string; categoryId: string; status: string; page: number };
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  const selectedCount = useMemo(() => Object.values(selectedIds).filter(Boolean).length, [selectedIds]);
  const allSelected = items.length > 0 && items.every((p) => selectedIds[p.id]);

  function setParam(next: Record<string, string>) {
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.categoryId) params.set("categoryId", next.categoryId);
    if (next.status) params.set("status", next.status);
    params.set("page", "1");
    router.push(`/products?${params.toString()}`);
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Daftar Produk</CardTitle>
        <div className="text-sm text-muted-foreground">{selectedCount > 0 ? `${selectedCount} terpilih` : null}</div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget as HTMLFormElement);
            const q = String(fd.get("q") ?? "");
            const categoryId = String(fd.get("categoryId") ?? "");
            const status = String(fd.get("status") ?? "");
            setParam({ q, categoryId, status });
          }}
        >
          <div className="flex-1 min-w-[260px]">
            <Input name="q" defaultValue={query.q} placeholder="Cari produk atau SKU... (Enter)" />
          </div>
          <select
            name="categoryId"
            className="h-11 rounded-xl border bg-background px-3 text-sm"
            value={query.categoryId}
            onChange={(e) => setParam({ q: query.q, categoryId: e.target.value, status: query.status })}
          >
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            name="status"
            className="h-11 rounded-xl border bg-background px-3 text-sm"
            value={query.status}
            onChange={(e) => setParam({ q: query.q, categoryId: query.categoryId, status: e.target.value })}
          >
            <option value="">Semua Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <Button type="submit" variant="outline" className="hidden rounded-xl sm:inline-flex">Cari</Button>
        </form>

          {selectedCount > 0 ? (
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setSelectedIds({})}
              >
                Reset
              </Button>
              <Button
                variant="destructive"
                className="gap-2"
                disabled={isPending}
                onClick={() => {
                  const ids = Object.entries(selectedIds)
                    .filter(([, v]) => v)
                    .map(([k]) => k);
                  const ok = window.confirm(`Hapus ${ids.length} produk terpilih? Aksi tidak bisa dibatalkan.`);
                  if (!ok) return;
                  startTransition(async () => {
                    const res = await deleteManyProductsAction(ids);
                    if (res.ok) setSelectedIds({});
                  });
                }}
              >
                <Trash2 className="h-4 w-4" />
                {isPending ? "Menghapus..." : "Hapus"}
              </Button>
            </div>
          ) : null}

        <div className="overflow-x-auto rounded-xl border bg-background">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[hsl(var(--primary))]"
                    checked={allSelected}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const next: Record<string, boolean> = {};
                      for (const p of items) next[p.id] = checked;
                      setSelectedIds(next);
                    }}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Nama Produk</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    Tidak ada data.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[hsl(var(--primary))]"
                        checked={Boolean(selectedIds[p.id])}
                        onChange={(e) => setSelectedIds((prev) => ({ ...prev, [p.id]: e.target.checked }))}
                        aria-label={`Select ${p.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border bg-muted/20">
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">{p.name.slice(0,1).toUpperCase()}</div>
                          )}
                        </div>
                        <Link href={`/products/${p.id}`} className="hover:underline line-clamp-1">{p.name}</Link>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                    <TableCell className="min-w-[160px]">
                      <Code128Mark value={(p.barcode ?? p.sku) as string} label={p.barcode ?? p.sku} height={28} moduleWidth={1.2} className="max-w-[220px]" />
                    </TableCell>
                    <TableCell>{p.categoryName}</TableCell>
                    <TableCell>{formatRupiah(p.sellingPrice)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number.isFinite(p.stock) ? p.stock.toLocaleString("id-ID") : "-"}</TableCell>
                    <TableCell>
                      {p.isActive ? (
                        <Badge className="border-emerald-200 bg-emerald-100 text-emerald-900">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button asChild variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label="Lihat detail">
                          <Link href={`/products/${p.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label="Edit">
                          <Link href={`/products/${p.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <DeleteProductButton id={p.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
