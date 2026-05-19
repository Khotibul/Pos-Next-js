"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { DoorClosed, DoorOpen } from "lucide-react";
import type { ActionResult } from "@/lib/action";
import { closeShiftAction, openShiftAction } from "@/modules/shifts/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = {
  id: string;
  status: "OPEN" | "CLOSED";
  cashierName: string;
  openedAt: string;
  closedAt: string | null;
  openingCash: number;
  closingCash: number;
};

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}

export function ShiftsTable({ items, openShiftId }: { items: Row[]; openShiftId: string | null }) {
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);

  const [openState, openFormAction, openPending] = useActionState(openShiftAction, null as ActionResult<{ id: string }> | null);
  const [closeState, closeFormAction, closePending] = useActionState(closeShiftAction, null as ActionResult<{ id: string }> | null);

  const openErrors = useMemo(() => ((openState && !openState.ok ? openState.fieldErrors : undefined) ?? {}) as Record<string, string>, [openState]);
  const closeErrors = useMemo(() => ((closeState && !closeState.ok ? closeState.fieldErrors : undefined) ?? {}) as Record<string, string>, [closeState]);

  useEffect(() => {
    if (openState && openState.ok) setOpenDialog(false);
  }, [openState]);
  useEffect(() => {
    if (closeState && closeState.ok) setCloseDialog(false);
  }, [closeState]);

  const openMessage = openState && !openState.ok ? openState.message : null;
  const closeMessage = closeState && !closeState.ok ? closeState.message : null;

  function rupiah(n: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
  }

  return (
    <div className="grid gap-4">
      <Card className="rounded-2xl">
        <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
          <div className="text-sm text-muted-foreground">
            Shift kasir digunakan untuk kontrol kas dan rekap penjualan per shift.
          </div>
          <div className="flex gap-2">
            <Button type="button" className="rounded-xl" onClick={() => setOpenDialog(true)} disabled={Boolean(openShiftId)}>
              <DoorOpen className="mr-2 h-4 w-4" />
              Buka Shift
            </Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setCloseDialog(true)} disabled={!openShiftId}>
              <DoorClosed className="mr-2 h-4 w-4" />
              Tutup Shift
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-2xl border bg-background">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Kasir</TableHead>
              <TableHead>Opened</TableHead>
              <TableHead>Closed</TableHead>
              <TableHead className="text-right">Opening Cash</TableHead>
              <TableHead className="text-right">Closing Cash</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Belum ada shift.
                </TableCell>
              </TableRow>
            ) : (
              items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs ${s.status === "OPEN" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                      {s.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{s.cashierName}</TableCell>
                  <TableCell className="text-sm">{new Date(s.openedAt).toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-sm">{s.closedAt ? new Date(s.closedAt).toLocaleString("id-ID") : "-"}</TableCell>
                  <TableCell className="text-right text-sm">{rupiah(s.openingCash)}</TableCell>
                  <TableCell className="text-right text-sm">{rupiah(s.closingCash)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Buka Shift</DialogTitle>
            <DialogDescription>Set opening cash sebelum mulai transaksi.</DialogDescription>
          </DialogHeader>
          {openMessage ? <Alert variant="destructive">{openMessage}</Alert> : null}
          <form action={openFormAction} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="openingCash">Opening Cash</Label>
              <Input id="openingCash" name="openingCash" type="number" step="1" defaultValue="0" />
              <FieldError msg={openErrors.openingCash} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="note">Catatan</Label>
              <Input id="note" name="note" placeholder="Opsional" />
              <FieldError msg={openErrors.note} />
            </div>
            <DialogFooter>
              <Button type="submit" className="rounded-xl" disabled={openPending}>
                {openPending ? "Memproses..." : "Buka Shift"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Tutup Shift</DialogTitle>
            <DialogDescription>Masukkan closing cash untuk menutup shift.</DialogDescription>
          </DialogHeader>
          {closeMessage ? <Alert variant="destructive">{closeMessage}</Alert> : null}
          <form action={closeFormAction} className="grid gap-4">
            <input type="hidden" name="id" value={openShiftId ?? ""} />
            <div className="grid gap-2">
              <Label htmlFor="closingCash">Closing Cash</Label>
              <Input id="closingCash" name="closingCash" type="number" step="1" defaultValue="0" />
              <FieldError msg={closeErrors.closingCash} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="noteClose">Catatan</Label>
              <Input id="noteClose" name="note" placeholder="Opsional" />
              <FieldError msg={closeErrors.note} />
            </div>
            <DialogFooter>
              <Button type="submit" className="rounded-xl" disabled={closePending || !openShiftId}>
                {closePending ? "Memproses..." : "Tutup Shift"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

