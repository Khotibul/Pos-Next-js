"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Eye, Trash2 } from "lucide-react";
import { deleteSaleAction } from "@/modules/transactions/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = {
  id: string;
  invoiceNo: string;
  status: string;
  total: unknown;
  createdAt: string;
};

function rupiah(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
}

export function SalesHistoryTable({ items, canDelete }: { items: Row[]; canDelete: boolean }) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<Row | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="grid gap-3">
      {notice ? <Alert variant="destructive">{notice}</Alert> : null}
      <div className="overflow-x-auto rounded-2xl border bg-background">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>ID Transaksi</TableHead>
              <TableHead>Waktu</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Belum ada transaksi.
                </TableCell>
              </TableRow>
            ) : (
              items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs text-primary">{s.invoiceNo}</TableCell>
                  <TableCell>{new Date(s.createdAt).toLocaleString("id-ID")}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs ${
                        s.status === "PAID"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : s.status === "VOID"
                            ? "bg-red-500/15 text-red-700 dark:text-red-300"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {s.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">{rupiah(s.total)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="outline" size="sm" className="h-9 w-9 rounded-xl p-0" aria-label="Detail">
                        <Link href={`/pos/history/${s.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {canDelete ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 rounded-xl p-0"
                          onClick={() => setConfirmId(s)}
                          aria-label="Hapus"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(confirmId)} onOpenChange={(v) => (!v ? setConfirmId(null) : null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Hapus transaksi?</DialogTitle>
            <DialogDescription>
              {confirmId ? `Transaksi "${confirmId.invoiceNo}" akan dihapus permanen.` : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" type="button" onClick={() => setConfirmId(null)} disabled={isPending}>
              Batal
            </Button>
            <Button
              className="rounded-xl"
              type="button"
              disabled={isPending || !confirmId}
              onClick={() => {
                if (!confirmId) return;
                setNotice(null);
                startTransition(async () => {
                  const res = await deleteSaleAction(confirmId.id);
                  if (!res.ok) {
                    setNotice(res.message);
                    setConfirmId(null);
                    return;
                  }
                  setConfirmId(null);
                  router.refresh();
                });
              }}
            >
              {isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

