"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowLeftRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { createTransferAction } from "@/modules/products/enterprise/actions";

type WarehouseItem = { id: string; name: string; type: string; branchName: string | null };
type ProductItem = { id: string; sku: string; name: string; barcode: string | null };

type Row = { id: string; productId: string; qty: string };

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function TransferStockDialog({
  warehouses,
  products,
}: {
  warehouses: WarehouseItem[];
  products: ProductItem[];
}) {
  const [open, setOpen] = useState(false);
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([{ id: uid(), productId: "", qty: "1" }]);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const canSubmit = useMemo(() => {
    if (!fromWarehouseId || !toWarehouseId) return false;
    if (fromWarehouseId === toWarehouseId) return false;
    const items = rows.filter((r) => r.productId.trim());
    if (items.length === 0) return false;
    for (const r of items) {
      const qty = Number(r.qty);
      if (!Number.isFinite(qty) || qty <= 0) return false;
    }
    return true;
  }, [fromWarehouseId, toWarehouseId, rows]);

  function resetForm() {
    setFromWarehouseId("");
    setToWarehouseId("");
    setNotes("");
    setRows([{ id: uid(), productId: "", qty: "1" }]);
  }

  return (
    <>
      <Button type="button" className="w-fit gap-2 rounded-xl" onClick={() => setOpen(true)}>
        <ArrowLeftRight className="h-4 w-4" />
        Buat Transfer
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setMessage(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transfer Stok</DialogTitle>
            <DialogDescription>Pindahkan stok antar gudang/cabang. Perubahan tercatat di audit log.</DialogDescription>
          </DialogHeader>

          {message ? <Alert variant={message.kind === "error" ? "destructive" : "default"}>{message.text}</Alert> : null}

          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Dari Gudang</Label>
                <select
                  className="h-10 rounded-xl border bg-background px-3 text-sm"
                  value={fromWarehouseId}
                  onChange={(e) => setFromWarehouseId(e.target.value)}
                >
                  <option value="">Pilih gudang</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                      {w.branchName ? ` • ${w.branchName}` : ""} ({w.type})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Ke Gudang</Label>
                <select
                  className="h-10 rounded-xl border bg-background px-3 text-sm"
                  value={toWarehouseId}
                  onChange={(e) => setToWarehouseId(e.target.value)}
                >
                  <option value="">Pilih gudang</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                      {w.branchName ? ` • ${w.branchName}` : ""} ({w.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Catatan (opsional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Misal: transfer untuk restock outlet A" />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Item Transfer</div>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 rounded-xl"
                  onClick={() => setRows((prev) => [...prev, { id: uid(), productId: "", qty: "1" }])}
                >
                  <Plus className="h-4 w-4" />
                  Tambah Item
                </Button>
              </div>

              <div className="grid gap-2">
                {rows.map((r, idx) => (
                  <div key={r.id} className="grid gap-2 rounded-2xl border bg-background p-3 sm:grid-cols-[1fr_140px_44px] sm:items-end">
                    <div className="grid gap-2">
                      <Label>Produk</Label>
                      <select
                        className="h-10 rounded-xl border bg-background px-3 text-sm"
                        value={r.productId}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, productId: v } : x)));
                        }}
                      >
                        <option value="">Pilih produk</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} • {p.sku}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Qty</Label>
                      <Input
                        inputMode="decimal"
                        value={r.qty}
                        onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, qty: e.target.value } : x)))}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-10 w-10 rounded-xl p-0 text-destructive"
                      aria-label="Hapus item"
                      onClick={() =>
                        setRows((prev) => {
                          if (prev.length <= 1) return prev;
                          return prev.filter((x) => x.id !== r.id);
                        })
                      }
                      disabled={rows.length === 1 && idx === 0}
                      title={rows.length === 1 ? "Minimal 1 item" : "Hapus"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setOpen(false);
                setMessage(null);
              }}
            >
              Tutup
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={!canSubmit || pending}
              onClick={() => {
                setMessage(null);
                const items = rows
                  .filter((r) => r.productId.trim())
                  .map((r) => ({
                    productId: r.productId,
                    variantId: "",
                    batchId: "",
                    qty: Number(r.qty),
                  }));

                startTransition(async () => {
                  const res = await createTransferAction({
                    fromWarehouseId,
                    toWarehouseId,
                    notes,
                    items,
                  });
                  if (!res.ok) {
                    setMessage({ kind: "error", text: res.message || "Gagal transfer stok." });
                    return;
                  }
                  setMessage({ kind: "success", text: "Transfer stok berhasil dibuat." });
                  resetForm();
                });
              }}
            >
              {pending ? "Menyimpan..." : "Simpan Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
