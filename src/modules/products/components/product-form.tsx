"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { ActionResult } from "@/lib/action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

type Meta = {
  categories: Array<{ id: string; name: string }>;
  brands: Array<{ id: string; name: string }>;
  units: Array<{ id: string; name: string }>;
};

type Initial = {
  id?: string;
  sku?: string;
  name?: string;
  barcode?: string | null;
  categoryId?: string | null;
  brandId?: string | null;
  unitId?: string | null;
  costPrice?: number | string;
  sellingPrice?: number | string;
  isActive?: boolean;
};

export function ProductForm({
  title,
  meta,
  initial,
  action,
}: {
  title: string;
  meta: Meta;
  initial?: Initial;
  action: (prev: unknown, formData: FormData) => Promise<ActionResult<{ id: string }>>;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const fieldErrors = (state && !state.ok ? state.fieldErrors : undefined) ?? {};
  const message = state && !state.ok ? state.message : null;

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Perubahan tersimpan per-tenant dan tercatat audit log.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/products">Kembali</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {message ? <Alert variant="destructive">{message}</Alert> : null}
        <form action={formAction} className="mt-4 grid gap-4">
        {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}

        <div className="grid gap-2">
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" name="sku" defaultValue={initial?.sku ?? ""} />
          {fieldErrors.sku ? <p className="text-xs text-destructive">{fieldErrors.sku}</p> : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="name">Nama Produk</Label>
          <Input id="name" name="name" defaultValue={initial?.name ?? ""} />
          {fieldErrors.name ? <p className="text-xs text-destructive">{fieldErrors.name}</p> : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="barcode">Barcode</Label>
          <Input id="barcode" name="barcode" defaultValue={initial?.barcode ?? ""} />
          {fieldErrors.barcode ? <p className="text-xs text-destructive">{fieldErrors.barcode}</p> : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="categoryId">Kategori</Label>
            <select
              id="categoryId"
              name="categoryId"
              defaultValue={initial?.categoryId ?? ""}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">-</option>
              {meta.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="brandId">Brand</Label>
            <select
              id="brandId"
              name="brandId"
              defaultValue={initial?.brandId ?? ""}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">-</option>
              {meta.brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="unitId">Satuan</Label>
            <select
              id="unitId"
              name="unitId"
              defaultValue={initial?.unitId ?? ""}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">-</option>
              {meta.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="costPrice">Harga Modal</Label>
            <Input id="costPrice" name="costPrice" type="number" step="0.01" defaultValue={String(initial?.costPrice ?? 0)} />
            {fieldErrors.costPrice ? <p className="text-xs text-destructive">{fieldErrors.costPrice}</p> : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sellingPrice">Harga Jual</Label>
            <Input id="sellingPrice" name="sellingPrice" type="number" step="0.01" defaultValue={String(initial?.sellingPrice ?? 0)} />
            {fieldErrors.sellingPrice ? <p className="text-xs text-destructive">{fieldErrors.sellingPrice}</p> : null}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={initial?.isActive ?? true} />
          Aktif
        </label>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </form>
      </CardContent>
    </Card>
  );
}
