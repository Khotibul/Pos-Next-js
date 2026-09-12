"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2, Wallet, Eye } from "lucide-react";
import { upsertReceivableAction, deleteReceivableAction, createReceivablePaymentAction } from "@/features/receivables/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Item = {
  id: string;
  invoiceNo: string;
  description: string | null;
  customerId: string | null;
  customerName: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string | null;
  status: string;
  createdAt: string;
};

type CustomerOpt = { id: string; name: string };

function statusBadge(status: string) {
  const map: Record<string, string> = {
    UNPAID: "bg-red-500/15 text-red-700 dark:text-red-300",
    PARTIAL: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    PAID: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    OVERDUE: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  };
  return map[status] ?? "bg-muted text-muted-foreground";
}

function formatRp(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
}

export function ReceivablesTable({ items, q, status, customers }: { items: Item[]; q?: string | null; status?: string | null; customers: CustomerOpt[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState<Item | null>(null);

  const [state, formAction, isPending] = useActionState(upsertReceivableAction, null);
  const [payState, payAction, isPayPending] = useActionState(createReceivablePaymentAction, null);

  const fieldMsg = useMemo(() => (!state || state.ok ? null : state.message), [state]);
  const payMsg = useMemo(() => (!payState || payState.ok ? null : payState.message), [payState]);

  useEffect(() => {
    if (state && state.ok) { setOpen(false); setEditing(null); }
  }, [state]);
  useEffect(() => {
    if (payState && payState.ok) { setPayOpen(null); }
  }, [payState]);

  const [isDeleting, startDelete] = useTransition();
  const [confirm, setConfirm] = useState<Item | null>(null);

  return (
    <div className="grid gap-4">
      {notice ? <Alert variant="destructive">{notice}</Alert> : null}

      <Card className="rounded-2xl">
        <CardContent className="py-4">
          <form className="flex flex-wrap gap-2">
            <input name="q" defaultValue={q ?? ""} placeholder="Cari invoice / pelanggan..." className="h-11 w-full max-w-md rounded-xl border bg-background px-3 text-sm" />
            <select name="status" defaultValue={status ?? ""} className="h-11 rounded-xl border bg-background px-3 text-sm">
              <option value="">Semua status</option>
              <option value="UNPAID">UNPAID</option>
              <option value="PARTIAL">PARTIAL</option>
              <option value="PAID">PAID</option>
              <option value="OVERDUE">OVERDUE</option>
            </select>
            <Button type="submit" variant="outline" className="rounded-xl">Cari</Button>
            <Button type="button" className="ml-auto rounded-xl" onClick={() => { setNotice(null); setEditing(null); setOpen(true); }}>Tambah Piutang</Button>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-2xl border bg-background">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Dibayar</TableHead>
              <TableHead>Sisa</TableHead>
              <TableHead>Jatuh Tempo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Belum ada piutang.</TableCell></TableRow>
            ) : items.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs font-medium">{r.invoiceNo}</TableCell>
                <TableCell>{r.customerName ?? "-"}</TableCell>
                <TableCell>{formatRp(r.totalAmount)}</TableCell>
                <TableCell className="text-emerald-600">{formatRp(r.paidAmount)}</TableCell>
                <TableCell className="font-semibold">{formatRp(r.remainingAmount)}</TableCell>
                <TableCell className="text-xs">{r.dueDate ? new Date(r.dueDate).toLocaleDateString("id-ID") : "-"}</TableCell>
                <TableCell><span className={`inline-flex rounded-full px-2 py-1 text-xs ${statusBadge(r.status)}`}>{r.status}</span></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <Button asChild variant="outline" size="sm" className="h-8 w-8 rounded-xl p-0"><Link href={`/receivables/${r.id}`}><Eye className="h-3.5 w-3.5" /></Link></Button>
                    <Button type="button" variant="outline" size="sm" className="h-8 w-8 rounded-xl p-0" onClick={() => setPayOpen(r)} title="Bayar"><Wallet className="h-3.5 w-3.5" /></Button>
                    <Button type="button" variant="outline" size="sm" className="h-8 w-8 rounded-xl p-0" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button type="button" variant="outline" size="sm" className="h-8 w-8 rounded-xl p-0" onClick={() => setConfirm(r)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Upsert Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl rounded-2xl" key={editing?.id ?? "new"}>
          <DialogHeader>
            <DialogTitle>{editing ? "Ubah Piutang" : "Tambah Piutang"}</DialogTitle>
            <DialogDescription>Catat piutang pelanggan (utang pelanggan ke toko). Bisa dari penjualan kredit atau manual.</DialogDescription>
          </DialogHeader>
          {fieldMsg ? <Alert variant="destructive">{fieldMsg}</Alert> : null}
          <form action={formAction} className="mt-3 grid gap-4">
            {editing?.id ? <input type="hidden" name="id" value={editing.id} /> : null}
            <div className="grid gap-2">
              <Label htmlFor="invoiceNo">No Invoice</Label>
              <Input id="invoiceNo" name="invoiceNo" defaultValue={editing?.invoiceNo ?? ""} placeholder="INV-PIUTANG-001" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customerId">Pelanggan</Label>
              <select id="customerId" name="customerId" defaultValue={editing?.customerId ?? ""} className="h-11 rounded-xl border bg-background px-3 text-sm">
                <option value="">— Tanpa pelanggan —</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Input id="description" name="description" defaultValue={editing?.description ?? ""} placeholder="Piutang penjualan kredit / pinjaman..." />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="totalAmount">Total Piutang (Rp)</Label>
                <Input id="totalAmount" name="totalAmount" type="number" min={0} defaultValue={editing?.totalAmount ?? 0} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Jatuh Tempo</Label>
                <Input id="dueDate" name="dueDate" type="date" defaultValue={editing?.dueDate ? new Date(editing.dueDate).toISOString().slice(0,10) : ""} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Catatan</Label>
              <Input id="notes" name="notes" defaultValue="" placeholder="Catatan opsional" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending} className="rounded-xl">{isPending ? "Menyimpan..." : "Simpan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={Boolean(payOpen)} onOpenChange={(v) => !v && setPayOpen(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Bayar Piutang — {payOpen?.invoiceNo}</DialogTitle>
            <DialogDescription>Sisa: {payOpen ? formatRp(payOpen.remainingAmount) : "-"} • Total: {payOpen ? formatRp(payOpen.totalAmount) : "-"}</DialogDescription>
          </DialogHeader>
          {payMsg ? <Alert variant="destructive">{payMsg}</Alert> : null}
          <form action={payAction} className="grid gap-4">
            <input type="hidden" name="receivableId" value={payOpen?.id ?? ""} />
            <div className="grid gap-2">
              <Label htmlFor="pay-amount">Jumlah Bayar</Label>
              <Input id="pay-amount" name="amount" type="number" min={1} max={payOpen?.remainingAmount ?? undefined} placeholder="0" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pay-method">Metode</Label>
              <select id="pay-method" name="method" defaultValue="CASH" className="h-11 rounded-xl border bg-background px-3 text-sm">
                <option value="CASH">CASH</option>
                <option value="TRANSFER">TRANSFER</option>
                <option value="QRIS">QRIS</option>
                <option value="EWALLET">EWALLET</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pay-reference">Referensi</Label>
              <Input id="pay-reference" name="reference" placeholder="No. referensi / opsional" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pay-notes">Catatan</Label>
              <Input id="pay-notes" name="notes" placeholder="Catatan pembayaran" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPayPending || !payOpen || payOpen.remainingAmount <= 0} className="rounded-xl">{isPayPending ? "Memproses..." : "Simpan Pembayaran"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={Boolean(confirm)} onOpenChange={(v) => !v && setConfirm(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Hapus piutang?</DialogTitle>
            <DialogDescription>{confirm ? `Invoice "${confirm.invoiceNo}" akan dihapus permanen beserta pembayarannya.` : null}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" type="button" onClick={() => setConfirm(null)} disabled={isDeleting}>Batal</Button>
            <Button className="rounded-xl" type="button" disabled={isDeleting || !confirm} onClick={() => {
              if (!confirm) return;
              startDelete(async () => {
                const res = await deleteReceivableAction(confirm.id);
                if (!res.ok) { setNotice(res.message); setConfirm(null); return; }
                setConfirm(null);
              });
            }}>{isDeleting ? "Menghapus..." : "Hapus"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
