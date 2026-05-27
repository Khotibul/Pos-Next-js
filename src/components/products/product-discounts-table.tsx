"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, Plus, ScanLine, Trash2 } from "lucide-react";
import type { ProductDiscountListItem } from "@/modules/products/discounts/service";
import { upsertProductDiscountAction, deleteProductDiscountAction } from "@/modules/products/discounts/actions";
import { QrScannerDialog } from "@/components/pos/qr-scanner-dialog";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Item = ProductDiscountListItem;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}

function fmtRange(startsAt: string | null, endsAt: string | null) {
  if (!startsAt && !endsAt) return "-";
  const s = startsAt ? new Date(startsAt) : null;
  const e = endsAt ? new Date(endsAt) : null;
  if (s && e) return `${s.toLocaleString("id-ID")} → ${e.toLocaleString("id-ID")}`;
  if (s) return `Mulai ${s.toLocaleString("id-ID")}`;
  return `Sampai ${e?.toLocaleString("id-ID") ?? "-"}`;
}

function fmtDiscount(item: Item) {
  if (item.type === "PERCENT") return `${item.value}%`;
  if (item.type === "AMOUNT") return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.value);
  if (item.type === "BOGO") return `Buy ${item.buyQty ?? 1} Get ${item.getQty ?? 1}`;
  return "Bundle";
}

export function ProductDiscountsTable({
  items,
  q,
  branches,
  bundles,
}: {
  items: Item[];
  q?: string | null;
  branches: Array<{ id: string; name: string }>;
  bundles: Array<{ id: string; name: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [productCode, setProductCode] = useState("");
  const [pickedProduct, setPickedProduct] = useState<{ id: string; name: string; sku: string } | null>(null);
  const [isFinding, startFind] = useTransition();

  const [state, formAction, isPending] = useActionState(upsertProductDiscountAction, null);
  const fieldErrors = useMemo(() => ((state && !state.ok ? state.fieldErrors : undefined) ?? {}) as Record<string, string>, [state]);
  const message = state && !state.ok ? state.message : null;

  useEffect(() => {
    if (state && state.ok) {
      setOpen(false);
      setEditing(null);
      setPickedProduct(null);
      setProductCode("");
    }
  }, [state]);

  useEffect(() => {
    if (!open) return;
    if (editing?.productId) {
      setPickedProduct({ id: editing.productId, name: editing.productName ?? "Produk", sku: editing.sku ?? "-" });
      setProductCode(editing.sku ?? "");
    } else {
      setPickedProduct(null);
      setProductCode("");
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
            placeholder="Cari produk / bundle..."
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
            Tambah Promo
          </Button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-background">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Target</TableHead>
              <TableHead>Cabang</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Nilai</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Belum ada promo.
                </TableCell>
              </TableRow>
            ) : (
              items.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="min-w-[260px]">
                    <div className="font-medium">{d.productName ?? d.bundleName ?? "-"}</div>
                    <div className="text-xs text-muted-foreground">{d.sku ?? (d.bundleId ? "Bundle" : "")}</div>
                  </TableCell>
                  <TableCell>{d.branchName ?? <span className="text-muted-foreground">Semua</span>}</TableCell>
                  <TableCell className="font-mono text-xs">{d.type}</TableCell>
                  <TableCell className="text-sm">{fmtDiscount(d)}</TableCell>
                  <TableCell className="min-w-[220px] text-xs text-muted-foreground">{fmtRange(d.startsAt, d.endsAt)}</TableCell>
                  <TableCell>{d.isActive ? <Badge variant="secondary">Active</Badge> : <Badge variant="destructive">Inactive</Badge>}</TableCell>
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
                          setEditing(d);
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
                          setConfirm(d);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl rounded-2xl" key={editing?.id ?? "new"}>
          <DialogHeader>
            <DialogTitle>{editing ? "Ubah Promo" : "Tambah Promo"}</DialogTitle>
            <DialogDescription>Support diskon nominal/persen, BOGO, dan bundle promo.</DialogDescription>
          </DialogHeader>

          {message ? <Alert variant="destructive">{message}</Alert> : null}

          <form action={formAction} className="grid gap-4">
            {editing?.id ? <input type="hidden" name="id" value={editing.id} /> : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Cabang</Label>
                <select
                  name="branchId"
                  defaultValue={editing?.branchId ?? ""}
                  className="h-11 w-full rounded-xl border bg-background px-3 text-sm"
                >
                  <option value="">Semua cabang</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <FieldError msg={fieldErrors.branchId} />
              </div>

              <div className="grid gap-2">
                <Label>Tipe Promo</Label>
                <select
                  name="type"
                  defaultValue={editing?.type ?? "PERCENT"}
                  className="h-11 w-full rounded-xl border bg-background px-3 text-sm"
                >
                  <option value="PERCENT">Diskon Persen</option>
                  <option value="AMOUNT">Diskon Nominal</option>
                  <option value="BOGO">Buy 1 Get 1</option>
                  <option value="BUNDLE">Bundle Promo</option>
                </select>
                <FieldError msg={fieldErrors.type} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Produk (SKU/Barcode/QR) — untuk AMOUNT/PERCENT/BOGO</Label>
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-[220px] flex-1">
                  <Input value={productCode} onChange={(e) => setProductCode(e.currentTarget.value)} placeholder="Scan / ketik SKU atau barcode..." />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  disabled={isFinding}
                  onClick={() => {
                    setNotice(null);
                    startFind(async () => {
                      await findProductByCode(productCode);
                    });
                  }}
                >
                  {isFinding ? "Mencari..." : "Cari"}
                </Button>
                <Button type="button" variant="outline" className="gap-2 rounded-xl" onClick={() => setScannerOpen(true)}>
                  <ScanLine className="h-4 w-4" />
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

            <div className="grid gap-2">
              <Label>Bundle — untuk BUNDLE</Label>
              <select
                name="bundleId"
                defaultValue={editing?.bundleId ?? ""}
                className="h-11 w-full rounded-xl border bg-background px-3 text-sm"
              >
                <option value="">(Tidak memilih)</option>
                {bundles.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <FieldError msg={fieldErrors.bundleId} />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="value">Nilai</Label>
                <Input id="value" name="value" type="number" min={0} step={1} defaultValue={editing?.value ?? 0} />
                <FieldError msg={fieldErrors.value} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="buyQty">Buy Qty (BOGO)</Label>
                <Input id="buyQty" name="buyQty" type="number" min={1} step={1} defaultValue={editing?.buyQty ?? ""} />
                <FieldError msg={fieldErrors.buyQty} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="getQty">Get Qty (BOGO)</Label>
                <Input id="getQty" name="getQty" type="number" min={1} step={1} defaultValue={editing?.getQty ?? ""} />
                <FieldError msg={fieldErrors.getQty} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="startsAt">Mulai</Label>
                <Input id="startsAt" name="startsAt" type="datetime-local" defaultValue={editing?.startsAt ? new Date(editing.startsAt).toISOString().slice(0, 16) : ""} />
                <FieldError msg={fieldErrors.startsAt} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endsAt">Selesai</Label>
                <Input id="endsAt" name="endsAt" type="datetime-local" defaultValue={editing?.endsAt ? new Date(editing.endsAt).toISOString().slice(0, 16) : ""} />
                <FieldError msg={fieldErrors.endsAt} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Status</Label>
              <select
                name="isActive"
                defaultValue={editing?.isActive === false ? "false" : "true"}
                className="h-11 w-full rounded-xl border bg-background px-3 text-sm"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isPending} className="rounded-xl">
                {isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirm)} onOpenChange={(v) => (!v ? setConfirm(null) : null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Hapus promo?</DialogTitle>
            <DialogDescription>{confirm ? `Promo "${confirm.productName ?? confirm.bundleName ?? "-"}" akan dihapus.` : null}</DialogDescription>
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
                  const res = await deleteProductDiscountAction(confirm.id);
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
    </div>
  );
}
