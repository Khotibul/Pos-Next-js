"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { createVariantAction, deleteVariantAction, updateVariantAction } from "@/modules/products/enterprise/actions";

type VariantRow = {
  id: string;
  sku: string;
  name: string;
  barcode: string | null;
  qrCode: string | null;
  sellingPrice: number;
  costPrice: number;
  isActive: boolean;
  updatedAt: string;
  attributes?: Record<string, unknown> | null;
};

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function VariantDialog({
  open,
  onOpenChange,
  productId,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productId: string;
  initial?: VariantRow | null;
}) {
  const isEdit = Boolean(initial?.id);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Variant" : "Tambah Variant"}</DialogTitle>
          <DialogDescription>Variant punya SKU/barcode/harga sendiri dan dipisahkan dari master product.</DialogDescription>
        </DialogHeader>
        {message ? <Alert variant="destructive">{message}</Alert> : null}
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setMessage(null);
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              const action = isEdit ? updateVariantAction : createVariantAction;
              const res = await action(null, formData);
              if (!res.ok) {
                setMessage(res.message || "Validasi gagal.");
                return;
              }
              onOpenChange(false);
            });
          }}
        >
          {isEdit ? <input type="hidden" name="id" value={initial!.id} /> : null}
          <input type="hidden" name="productId" value={productId} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="sku">SKU (opsional)</Label>
              <Input id="sku" name="sku" defaultValue={initial?.sku ?? ""} placeholder="Kosongkan untuk otomatis" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Nama Variant</Label>
              <Input id="name" name="name" defaultValue={initial?.name ?? ""} placeholder="Contoh: Merah - XL" required />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="barcode">Barcode</Label>
              <Input id="barcode" name="barcode" defaultValue={initial?.barcode ?? ""} placeholder="EAN13/CODE128" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="qrCode">QR Code</Label>
              <Input id="qrCode" name="qrCode" defaultValue={initial?.qrCode ?? ""} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="costPrice">Harga Modal</Label>
              <Input id="costPrice" name="costPrice" type="number" step="0.01" defaultValue={String(initial?.costPrice ?? 0)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sellingPrice">Harga Jual</Label>
              <Input id="sellingPrice" name="sellingPrice" type="number" step="0.01" defaultValue={String(initial?.sellingPrice ?? 0)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="option1Name">Atribut 1 (opsional)</Label>
              <Input id="option1Name" name="option1Name" placeholder="Warna" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="option1Value">Nilai</Label>
              <Input id="option1Value" name="option1Value" placeholder="Merah" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="option2Name">Atribut 2 (opsional)</Label>
              <Input id="option2Name" name="option2Name" placeholder="Ukuran" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="option2Value">Nilai</Label>
              <Input id="option2Value" name="option2Value" placeholder="XL" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={initial?.isActive ?? true} />
            Aktif
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" className="rounded-xl" disabled={pending}>
              {pending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProductVariantsTable({ productId, variants }: { productId: string; variants: VariantRow[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<VariantRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const rows = useMemo(() => variants, [variants]);

  return (
    <div className="grid gap-3 rounded-2xl border bg-background p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">Variants</div>
          <div className="text-xs text-muted-foreground">Kelola variasi seperti warna/size/kemasan.</div>
        </div>
        <Button type="button" className="gap-2 rounded-xl" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Tambah
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">Belum ada variant.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="px-3 py-2">Nama</th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Harga</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{v.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{v.sku}</td>
                  <td className="px-3 py-2">{rupiah(v.sellingPrice)}</td>
                  <td className="px-3 py-2">
                    {v.isActive ? (
                      <Badge className="border-emerald-200 bg-emerald-100 text-emerald-900">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={() => setEditing(v)}
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 text-destructive"
                        disabled={isPending}
                        onClick={() => {
                          const ok = window.confirm("Hapus variant ini? Aksi tidak bisa dibatalkan.");
                          if (!ok) return;
                          startTransition(async () => {
                            await deleteVariantAction(productId, v.id);
                          });
                        }}
                        aria-label="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <VariantDialog open={createOpen} onOpenChange={setCreateOpen} productId={productId} />
      <VariantDialog
        open={Boolean(editing)}
        onOpenChange={(v) => {
          if (!v) setEditing(null);
        }}
        productId={productId}
        initial={editing}
      />
    </div>
  );
}
