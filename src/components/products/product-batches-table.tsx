"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, Plus, ScanText, Trash2 } from "lucide-react";
import { upsertProductBatchAction, deleteProductBatchAction } from "@/modules/products/batches/actions";
import type { ProductBatchListItem } from "@/modules/products/batches/service";
import { QrScannerDialog } from "@/components/pos/qr-scanner-dialog";
import { ExpiredPhotoScanner } from "@/components/products/expired-photo-scanner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Item = ProductBatchListItem;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export function ProductBatchesTable({
  items,
  q,
}: {
  items: Item[];
  q?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [productCode, setProductCode] = useState("");
  const [pickedProduct, setPickedProduct] = useState<{ id: string; name: string; sku: string } | null>(null);
  const [isFinding, startFind] = useTransition();

  const [scannerOpen, setScannerOpen] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [ocrText, setOcrText] = useState<string>("");
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);

  const [state, formAction, isPending] = useActionState(upsertProductBatchAction, null);
  const fieldErrors = useMemo(() => ((state && !state.ok ? state.fieldErrors : undefined) ?? {}) as Record<string, string>, [state]);
  const message = state && !state.ok ? state.message : null;

  useEffect(() => {
    if (state && state.ok) {
      setOpen(false);
      setEditing(null);
      setPickedProduct(null);
      setProductCode("");
      setOcrText("");
      setOcrConfidence(null);
    }
  }, [state]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setPickedProduct({ id: editing.productId, name: editing.productName, sku: editing.sku });
      setProductCode(editing.barcode ?? editing.sku);
      setOcrText(editing.ocrText ?? "");
      setOcrConfidence(editing.confidence ?? null);
    } else {
      setPickedProduct(null);
      setProductCode("");
      setOcrText("");
      setOcrConfidence(null);
    }
  }, [open, editing]);

  async function findProductByCode(code: string) {
    const s = code.trim();
    if (!s) return;
    const res = await fetch(`/api/products/find-by-code?code=${encodeURIComponent(s)}`);
    const json = (await res.json().catch(() => null)) as unknown;
    const ok = res.ok && isRecord(json) && json.ok === true && isRecord(json.data) && isRecord(json.data.product);
    if (!ok) {
      setNotice(isRecord(json) && typeof json.message === "string" ? json.message : "Produk tidak ditemukan.");
      return;
    }
    const product = (json.data as Record<string, unknown>).product as Record<string, unknown>;
    const id = typeof product.id === "string" ? product.id : null;
    const name = typeof product.name === "string" ? product.name : null;
    const sku = typeof product.sku === "string" ? product.sku : null;
    if (!id || !name || !sku) {
      setNotice("Produk tidak ditemukan.");
      return;
    }
    setPickedProduct({ id, name, sku });
  }

  const [isDeleting, startDelete] = useTransition();
  const [confirm, setConfirm] = useState<Item | null>(null);

  return (
    <div className="grid gap-4">
      {notice ? <Alert variant="destructive">{notice}</Alert> : null}

      <div className="rounded-2xl border bg-background p-4">
        <form className="flex flex-wrap gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Cari batch / produk / SKU / barcode..."
            className="h-11 w-full max-w-lg rounded-xl border bg-background px-3 text-sm"
          />
          <Button type="submit" variant="outline" className="rounded-xl">
            Cari
          </Button>
          <Button
            type="button"
            className="ml-auto gap-2 rounded-xl"
            onClick={() => {
              setNotice(null);
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Tambah Batch
          </Button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-background">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Produk</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Expired</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Harga Modal</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Belum ada batch.
                </TableCell>
              </TableRow>
            ) : (
              items.map((b) => {
                const exp = b.expiredDate ? new Date(b.expiredDate) : null;
                const isExpired = exp ? exp.getTime() < Date.now() : false;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="min-w-[260px]">
                      <div className="font-medium">{b.productName}</div>
                      <div className="text-xs text-muted-foreground">{b.sku}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{b.batchNumber ?? "-"}</TableCell>
                    <TableCell>
                      {exp ? (
                        <div className="grid gap-1">
                          <div className="text-sm">{exp.toLocaleDateString("id-ID")}</div>
                          {isExpired ? <Badge variant="destructive">Expired</Badge> : <Badge variant="secondary">Aktif</Badge>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{b.quantity.toLocaleString("id-ID")}</TableCell>
                    <TableCell className="text-right">{fmtMoney(b.costPrice)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{b.source ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 rounded-xl p-0"
                          aria-label="Edit"
                          onClick={() => {
                            setNotice(null);
                            setEditing(b);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 rounded-xl p-0"
                          aria-label="Hapus"
                          onClick={() => {
                            setNotice(null);
                            setConfirm(b);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl rounded-2xl" key={editing?.id ?? "new"}>
          <DialogHeader>
            <DialogTitle>{editing ? "Ubah Batch" : "Tambah Batch"}</DialogTitle>
            <DialogDescription>Simpan batch number dan expired date untuk alert produk expired.</DialogDescription>
          </DialogHeader>

          {message ? <Alert variant="destructive">{message}</Alert> : null}

          <form action={formAction} className="grid gap-4">
            {editing?.id ? <input type="hidden" name="id" value={editing.id} /> : null}

            <div className="grid gap-2">
              <Label>Produk (SKU/Barcode)</Label>
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-[220px] flex-1">
                  <Input
                    value={productCode}
                    onChange={(e) => setProductCode(e.currentTarget.value)}
                    placeholder="Scan / ketik SKU atau barcode..."
                    disabled={Boolean(editing)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 rounded-xl"
                  disabled={Boolean(editing) || isFinding}
                  onClick={() => {
                    setNotice(null);
                    startFind(async () => {
                      await findProductByCode(productCode);
                    });
                  }}
                >
                  {isFinding ? "Mencari..." : "Cari"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 rounded-xl"
                  disabled={Boolean(editing)}
                  onClick={() => setScannerOpen(true)}
                >
                  <ScanText className="h-4 w-4" />
                  Scan
                </Button>
              </div>
              {pickedProduct ? (
                <div className="rounded-xl border bg-muted/10 p-3 text-sm">
                  <div className="font-medium">{pickedProduct.name}</div>
                  <div className="text-xs text-muted-foreground">{pickedProduct.sku}</div>
                  <input type="hidden" name="productId" value={pickedProduct.id} />
                </div>
              ) : (
                <FieldError msg={fieldErrors.productId} />
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="batchNumber">Batch Number</Label>
                <Input id="batchNumber" name="batchNumber" defaultValue={editing?.batchNumber ?? ""} placeholder="Contoh: LOT-001" />
                <FieldError msg={fieldErrors.batchNumber} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expiredDate">Expired Date</Label>
                <Input
                  id="expiredDate"
                  name="expiredDate"
                  type="date"
                  defaultValue={editing?.expiredDate ? new Date(editing.expiredDate).toISOString().slice(0, 10) : ""}
                />
                <FieldError msg={fieldErrors.expiredDate} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="quantity">Qty Batch</Label>
                <Input id="quantity" name="quantity" type="number" min={0} step={1} defaultValue={editing?.quantity ?? 0} />
                <FieldError msg={fieldErrors.quantity} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="costPrice">Harga Modal</Label>
                <Input id="costPrice" name="costPrice" type="number" min={0} step={1} defaultValue={editing?.costPrice ?? 0} />
                <FieldError msg={fieldErrors.costPrice} />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/10 p-3">
              <div className="grid gap-1">
                <div className="text-sm font-medium">Scan Expired dari Foto</div>
                <div className="text-xs text-muted-foreground">OCR akan mencoba membaca expired & batch dari foto.</div>
              </div>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOcrOpen(true)}>
                Buka Scanner
              </Button>
            </div>

            <input type="hidden" name="ocrText" value={ocrText} />
            {ocrConfidence != null ? <input type="hidden" name="confidence" value={String(ocrConfidence)} /> : null}
            <input type="hidden" name="source" value={ocrText ? "OCR_PHOTO" : editing?.source ?? "MANUAL"} />

            <DialogFooter>
              <Button type="submit" disabled={isPending || !pickedProduct} className="rounded-xl">
                {isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirm)} onOpenChange={(v) => (!v ? setConfirm(null) : null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Hapus batch?</DialogTitle>
            <DialogDescription>{confirm ? `Batch "${confirm.batchNumber ?? "-"}" untuk produk "${confirm.productName}" akan dihapus.` : null}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" type="button" onClick={() => setConfirm(null)} disabled={isDeleting}>
              Batal
            </Button>
            <Button
              className="rounded-xl"
              type="button"
              disabled={isDeleting || !confirm}
              onClick={() => {
                if (!confirm) return;
                setNotice(null);
                startDelete(async () => {
                  const res = await deleteProductBatchAction(confirm.id);
                  if (!res.ok) {
                    setNotice(res.message);
                    setConfirm(null);
                    return;
                  }
                  setConfirm(null);
                });
              }}
            >
              {isDeleting ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QrScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onDetected={async (code) => {
          setProductCode(code);
          setScannerOpen(false);
          await findProductByCode(code);
        }}
      />

      <ExpiredPhotoScanner
        open={ocrOpen}
        onOpenChange={setOcrOpen}
        onUseResult={(r) => {
          if (r.batchNumber) {
            const el = document.getElementById("batchNumber") as HTMLInputElement | null;
            if (el) el.value = r.batchNumber;
          }
          if (r.expiredDateIso) {
            const date = new Date(r.expiredDateIso);
            const el = document.getElementById("expiredDate") as HTMLInputElement | null;
            if (el) el.value = date.toISOString().slice(0, 10);
          }
          setOcrText(r.rawText);
          setOcrConfidence(r.confidence);
          setOcrOpen(false);
        }}
      />
    </div>
  );
}
