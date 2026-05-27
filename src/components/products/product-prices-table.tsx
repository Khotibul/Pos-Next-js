"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, Plus, ScanLine, Trash2 } from "lucide-react";
import type { ProductPriceListItem } from "@/modules/products/prices/service";
import { upsertProductPriceAction, deleteProductPriceAction } from "@/modules/products/prices/actions";
import { QrScannerDialog } from "@/components/pos/qr-scanner-dialog";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Item = ProductPriceListItem;

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

function fmtRange(startsAt: string | null, endsAt: string | null) {
  if (!startsAt && !endsAt) return "-";
  const s = startsAt ? new Date(startsAt) : null;
  const e = endsAt ? new Date(endsAt) : null;
  if (s && e) return `${s.toLocaleString("id-ID")} → ${e.toLocaleString("id-ID")}`;
  if (s) return `Mulai ${s.toLocaleString("id-ID")}`;
  return `Sampai ${e?.toLocaleString("id-ID") ?? "-"}`;
}

export function ProductPricesTable({
  items,
  q,
  branches,
}: {
  items: Item[];
  q?: string | null;
  branches: Array<{ id: string; name: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [productCode, setProductCode] = useState("");
  const [pickedProduct, setPickedProduct] = useState<{ id: string; name: string; sku: string } | null>(null);
  const [isFinding, startFind] = useTransition();

  const [state, formAction, isPending] = useActionState(upsertProductPriceAction, null);
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
    if (editing) {
      setPickedProduct({ id: editing.productId, name: editing.productName, sku: editing.sku });
      setProductCode(editing.sku);
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
            placeholder="Cari produk / SKU..."
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
            Tambah Rule Harga
          </Button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-background">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Produk</TableHead>
              <TableHead>Cabang</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead className="text-right">Harga</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Belum ada rule harga.
                </TableCell>
              </TableRow>
            ) : (
              items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="min-w-[260px]">
                    <div className="font-medium">{p.productName}</div>
                    <div className="text-xs text-muted-foreground">{p.sku}</div>
                  </TableCell>
                  <TableCell>{p.branchName ?? <span className="text-muted-foreground">Semua</span>}</TableCell>
                  <TableCell className="font-mono text-xs">{p.priceType}</TableCell>
                  <TableCell className="text-right">{fmtMoney(p.price)}</TableCell>
                  <TableCell className="min-w-[220px] text-xs text-muted-foreground">{fmtRange(p.startsAt, p.endsAt)}</TableCell>
                  <TableCell>{p.isActive ? <Badge variant="secondary">Active</Badge> : <Badge variant="destructive">Inactive</Badge>}</TableCell>
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
                          setEditing(p);
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
                          setConfirm(p);
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
            <DialogTitle>{editing ? "Ubah Rule Harga" : "Tambah Rule Harga"}</DialogTitle>
            <DialogDescription>Support harga per cabang, grosir, reseller, member, promo period & happy hour (via periode waktu).</DialogDescription>
          </DialogHeader>

          {message ? <Alert variant="destructive">{message}</Alert> : null}

          <form action={formAction} className="grid gap-4">
            {editing?.id ? <input type="hidden" name="id" value={editing.id} /> : null}

            <div className="grid gap-2">
              <Label>Produk (SKU/Barcode/QR)</Label>
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
                  className="rounded-xl"
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
                <Button type="button" variant="outline" className="gap-2 rounded-xl" disabled={Boolean(editing)} onClick={() => setScannerOpen(true)}>
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
                <Label>Tipe Harga</Label>
                <select
                  name="priceType"
                  defaultValue={editing?.priceType ?? "RETAIL"}
                  className="h-11 w-full rounded-xl border bg-background px-3 text-sm"
                >
                  <option value="RETAIL">RETAIL (Normal)</option>
                  <option value="WHOLESALE">WHOLESALE (Grosir)</option>
                  <option value="RESELLER">RESELLER</option>
                  <option value="MEMBER">MEMBER</option>
                </select>
                <FieldError msg={fieldErrors.priceType} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="price">Harga</Label>
                <Input id="price" name="price" type="number" min={0} step={1} defaultValue={editing?.price ?? 0} />
                <FieldError msg={fieldErrors.price} />
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
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="startsAt">Mulai (promo/happy hour)</Label>
                <Input id="startsAt" name="startsAt" type="datetime-local" defaultValue={editing?.startsAt ? new Date(editing.startsAt).toISOString().slice(0, 16) : ""} />
                <FieldError msg={fieldErrors.startsAt} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endsAt">Selesai</Label>
                <Input id="endsAt" name="endsAt" type="datetime-local" defaultValue={editing?.endsAt ? new Date(editing.endsAt).toISOString().slice(0, 16) : ""} />
                <FieldError msg={fieldErrors.endsAt} />
              </div>
            </div>

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
            <DialogTitle>Hapus rule harga?</DialogTitle>
            <DialogDescription>{confirm ? `Rule harga untuk "${confirm.productName}" akan dihapus.` : null}</DialogDescription>
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
                  const res = await deleteProductPriceAction(confirm.id);
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
