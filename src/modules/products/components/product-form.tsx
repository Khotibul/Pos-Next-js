"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { ActionResult } from "@/lib/action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Code128Mark } from "@/components/barcode/code128-mark";
import { QrScannerDialog } from "@/components/pos/qr-scanner-dialog";
import { ScanLine } from "lucide-react";

type Meta = {
  categories: Array<{ id: string; name: string }>;
  brands: Array<{ id: string; name: string }>;
  units: Array<{ id: string; name: string }>;
  suppliers?: Array<{ id: string; name: string }>;
};

type Initial = {
  id?: string;
  sku?: string;
  name?: string;
  slug?: string | null;
  description?: string | null;
  barcode?: string | null;
  qrCode?: string | null;
  categoryId?: string | null;
  brandId?: string | null;
  supplierId?: string | null;
  unitId?: string | null;
  costPrice?: number | string;
  sellingPrice?: number | string;
  marginPct?: number | string;
  taxRate?: number | string;
  weight?: number | string;
  volume?: number | string;
  minStock?: number | string;
  reorderPoint?: number | string;
  isActive?: boolean;
  isFeatured?: boolean;
  isConsignment?: boolean;
  type?: "SINGLE" | "VARIANT" | "BUNDLE" | "SERVICE" | "DIGITAL" | "ASSEMBLY";
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

  const [skuPreview, setSkuPreview] = useState(String(initial?.sku ?? ""));
  const [barcodePreview, setBarcodePreview] = useState(String(initial?.barcode ?? ""));
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanTarget, setScanTarget] = useState<"barcode" | "qrCode">("barcode");
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const qrInputRef = useRef<HTMLInputElement | null>(null);
  const barcodeValue = useMemo(() => {
    const b = barcodePreview.trim();
    if (b) return b;
    const s = skuPreview.trim();
    return s;
  }, [barcodePreview, skuPreview]);

  async function applyScanResult(code: string) {
    const v = String(code || "").trim();
    if (!v) return;
    if (scanTarget === "qrCode") {
      if (qrInputRef.current) qrInputRef.current.value = v;
    } else {
      setBarcodePreview(v);
      if (barcodeInputRef.current) barcodeInputRef.current.value = v;
    }
  }

  return (
    <>
      <Card className="max-w-3xl">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>Perubahan tersimpan per-tenant dan tercatat audit log.</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-xl">
              <Link href="/products">Kembali</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {message ? <Alert variant="destructive">{message}</Alert> : null}
          <form action={formAction} className="mt-4 grid gap-5">
            {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  name="sku"
                  defaultValue={initial?.sku ?? ""}
                  placeholder="Kosongkan untuk SKU otomatis"
                  onInput={(e) => setSkuPreview((e.currentTarget as HTMLInputElement).value)}
                />
                {fieldErrors.sku ? <p className="text-xs text-destructive">{fieldErrors.sku}</p> : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Tipe Produk</Label>
                <select
                  id="type"
                  name="type"
                  defaultValue={initial?.type ?? "SINGLE"}
                  className="h-10 rounded-xl border bg-background px-3 text-sm"
                >
                  <option value="SINGLE">Single</option>
                  <option value="VARIANT">Variant</option>
                  <option value="BUNDLE">Bundle/Paket</option>
                  <option value="ASSEMBLY">Assembly/Racikan</option>
                  <option value="SERVICE">Service</option>
                  <option value="DIGITAL">Digital</option>
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Nama Produk</Label>
              <Input id="name" name="name" defaultValue={initial?.name ?? ""} />
              {fieldErrors.name ? <p className="text-xs text-destructive">{fieldErrors.name}</p> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="slug">Slug (Opsional)</Label>
                <Input id="slug" name="slug" defaultValue={initial?.slug ?? ""} placeholder="contoh: indomie-goreng" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="supplierId">Supplier (Opsional)</Label>
                <select
                  id="supplierId"
                  name="supplierId"
                  defaultValue={initial?.supplierId ?? ""}
                  className="h-10 rounded-xl border bg-background px-3 text-sm"
                >
                  <option value="">-</option>
                  {(meta.suppliers ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Deskripsi (Opsional)</Label>
              <textarea
                id="description"
                name="description"
                defaultValue={initial?.description ?? ""}
                className="min-h-[88px] rounded-xl border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Catatan produk, komposisi, ukuran, dll"
              />
            </div>

        <div className="grid gap-2">
          <Label htmlFor="barcode">Barcode</Label>
          <div className="flex gap-2">
            <Input
              ref={barcodeInputRef}
              id="barcode"
              name="barcode"
              defaultValue={initial?.barcode ?? ""}
              onInput={(e) => setBarcodePreview((e.currentTarget as HTMLInputElement).value)}
            />
            <Button
              type="button"
              variant="outline"
              className="h-10 w-12 shrink-0 rounded-xl p-0"
              onClick={() => {
                setScanTarget("barcode");
                setScannerOpen(true);
              }}
              aria-label="Scan barcode"
              title="Scan barcode"
            >
              <ScanLine className="h-4 w-4" />
            </Button>
          </div>
          {fieldErrors.barcode ? <p className="text-xs text-destructive">{fieldErrors.barcode}</p> : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="qrCode">QR Code (Opsional)</Label>
          <div className="flex gap-2">
            <Input
              ref={qrInputRef}
              id="qrCode"
              name="qrCode"
              defaultValue={initial?.qrCode ?? ""}
              placeholder="Isi jika ingin kode QR khusus"
            />
            <Button
              type="button"
              variant="outline"
              className="h-10 w-12 shrink-0 rounded-xl p-0"
              onClick={() => {
                setScanTarget("qrCode");
                setScannerOpen(true);
              }}
              aria-label="Scan QR code"
              title="Scan QR code"
            >
              <ScanLine className="h-4 w-4" />
            </Button>
          </div>
          {fieldErrors.qrCode ? <p className="text-xs text-destructive">{fieldErrors.qrCode}</p> : null}
        </div>

        <div className="rounded-2xl border bg-muted/10 p-4">
          <div className="text-sm font-medium">Preview Barcode</div>
          <div className="mt-3 overflow-hidden rounded-xl border bg-background p-3">
            <Code128Mark value={barcodeValue} label={barcodeValue} height={44} moduleWidth={2} />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Jika field barcode kosong, sistem akan menampilkan barcode berdasarkan SKU.
          </div>
        </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="categoryId">Kategori</Label>
                <select
                  id="categoryId"
                  name="categoryId"
                  defaultValue={initial?.categoryId ?? ""}
                  className="h-10 rounded-xl border bg-background px-3 text-sm"
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
                  className="h-10 rounded-xl border bg-background px-3 text-sm"
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
                <Label htmlFor="unitId">Satuan Dasar</Label>
                <select
                  id="unitId"
                  name="unitId"
                  defaultValue={initial?.unitId ?? ""}
                  className="h-10 rounded-xl border bg-background px-3 text-sm"
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

            <div className="grid gap-3 sm:grid-cols-3">
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
              <div className="grid gap-2">
                <Label htmlFor="taxRate">Pajak (%)</Label>
                <Input id="taxRate" name="taxRate" type="number" step="0.01" defaultValue={String(initial?.taxRate ?? 0)} />
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border bg-muted/10 p-4 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isActive" defaultChecked={initial?.isActive ?? true} />
                Aktif
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isFeatured" defaultChecked={initial?.isFeatured ?? false} />
                Featured
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isConsignment" defaultChecked={initial?.isConsignment ?? false} />
                Konsinyasi
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="minStock">Minimum Stok</Label>
                <Input id="minStock" name="minStock" type="number" step="0.01" defaultValue={String(initial?.minStock ?? 0)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reorderPoint">Reorder Point</Label>
                <Input
                  id="reorderPoint"
                  name="reorderPoint"
                  type="number"
                  step="0.01"
                  defaultValue={String(initial?.reorderPoint ?? 0)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="weight">Berat</Label>
                <Input id="weight" name="weight" type="number" step="0.01" defaultValue={String(initial?.weight ?? 0)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="volume">Volume</Label>
                <Input id="volume" name="volume" type="number" step="0.01" defaultValue={String(initial?.volume ?? 0)} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={isPending} className="rounded-xl">
                {isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <QrScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onDetected={async (code) => {
          await applyScanResult(code);
        }}
      />
    </>
  );
}
