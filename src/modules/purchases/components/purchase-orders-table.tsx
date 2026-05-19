"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { ActionResult } from "@/lib/action";
import { deletePurchaseOrderAction, upsertPurchaseOrderAction } from "@/modules/purchases/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SupplierOption = { id: string; name: string };

type Row = {
  id: string;
  orderNo: string;
  status: "DRAFT" | "ORDERED" | "RECEIVED" | "CANCELED";
  supplierId: string | null;
  supplierName: string | null;
  notes: string | null;
  itemCount: number;
  createdAt: string;
};

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}

export function PurchaseOrdersTable({ items, suppliers }: { items: Row[]; suppliers: SupplierOption[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [state, formAction, isPending] = useActionState(upsertPurchaseOrderAction, null as ActionResult<{ id: string }> | null);
  const fieldErrors = useMemo(() => ((state && !state.ok ? state.fieldErrors : undefined) ?? {}) as Record<string, string>, [state]);
  const message = state && !state.ok ? state.message : null;

  useEffect(() => {
    if (state && state.ok) {
      setOpen(false);
      setEditing(null);
    }
  }, [state]);

  const [isDeleting, startDelete] = useTransition();
  const [confirm, setConfirm] = useState<Row | null>(null);

  return (
    <div className="grid gap-4">
      {notice ? <Alert variant="destructive">{notice}</Alert> : null}

      <Card className="rounded-2xl">
        <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
          <div className="text-sm text-muted-foreground">Pembelian (Purchase Order) per supplier.</div>
          <Button
            type="button"
            className="rounded-xl"
            onClick={() => {
              setNotice(null);
              setEditing(null);
              setOpen(true);
            }}
          >
            Buat PO
          </Button>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-2xl border bg-background">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>No PO</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Waktu</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Belum ada PO.
                </TableCell>
              </TableRow>
            ) : (
              items.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-mono text-xs text-primary">{po.orderNo}</TableCell>
                  <TableCell className="text-sm">{po.supplierName ?? "-"}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs ${
                        po.status === "RECEIVED"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : po.status === "ORDERED"
                            ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                            : po.status === "CANCELED"
                              ? "bg-red-500/15 text-red-700 dark:text-red-300"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {po.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{po.itemCount}</TableCell>
                  <TableCell className="text-sm">{new Date(po.createdAt).toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 rounded-xl p-0"
                        onClick={() => {
                          setNotice(null);
                          setEditing(po);
                          setOpen(true);
                        }}
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 rounded-xl p-0"
                        onClick={() => setConfirm(po)}
                        aria-label="Delete"
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
        <DialogContent className="max-w-xl rounded-2xl" key={editing?.id ?? "new"}>
          <DialogHeader>
            <DialogTitle>{editing ? "Ubah Purchase Order" : "Buat Purchase Order"}</DialogTitle>
            <DialogDescription>Catatan: item PO akan ditambahkan pada tahap berikutnya.</DialogDescription>
          </DialogHeader>
          {message ? <Alert variant="destructive">{message}</Alert> : null}

          <form action={formAction} className="mt-3 grid gap-4">
            {editing?.id ? <input type="hidden" name="id" value={editing.id} /> : null}

            <div className="grid gap-2">
              <Label htmlFor="orderNo">No PO (opsional)</Label>
              <Input id="orderNo" name="orderNo" defaultValue={editing?.orderNo ?? ""} placeholder="PO-240101-ABCD" />
              <FieldError msg={fieldErrors.orderNo} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="supplierId">Supplier</Label>
                <select
                  id="supplierId"
                  name="supplierId"
                  defaultValue={editing?.supplierId ?? ""}
                  className="h-11 rounded-xl border bg-background px-3 text-sm"
                >
                  <option value="">(Tanpa supplier)</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <FieldError msg={fieldErrors.supplierId} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <select id="status" name="status" defaultValue={editing?.status ?? "DRAFT"} className="h-11 rounded-xl border bg-background px-3 text-sm">
                  <option value="DRAFT">DRAFT</option>
                  <option value="ORDERED">ORDERED</option>
                  <option value="RECEIVED">RECEIVED</option>
                  <option value="CANCELED">CANCELED</option>
                </select>
                <FieldError msg={fieldErrors.status} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Catatan</Label>
              <Input id="notes" name="notes" defaultValue={editing?.notes ?? ""} placeholder="Catatan pembelian" />
              <FieldError msg={fieldErrors.notes} />
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
            <DialogTitle>Hapus PO?</DialogTitle>
            <DialogDescription>{confirm ? `PO "${confirm.orderNo}" akan dihapus permanen.` : null}</DialogDescription>
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
                  const res = await deletePurchaseOrderAction(confirm.id);
                  if (!res.ok) setNotice(res.message);
                  setConfirm(null);
                });
              }}
            >
              {isDeleting ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
