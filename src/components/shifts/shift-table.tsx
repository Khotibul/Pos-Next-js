"use client";

import Link from "next/link";
import { OpenShiftDialog } from "@/components/shifts/open-shift-dialog";
import { CloseShiftDialog } from "@/components/shifts/close-shift-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  status: "OPEN" | "CLOSED" | "APPROVED";
  cashierName: string;
  branchName: string;
  openedAt: string;
  closedAt: string | null;
  openingCash: number;
  totalSales: number;
  cashSystem: number;
  cashCounted: number | null;
  cashDifference: number;
};

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function statusBadge(s: Row["status"]) {
  if (s === "OPEN") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (s === "APPROVED") return "bg-primary/15 text-primary";
  return "bg-muted text-muted-foreground";
}

export function ShiftTable({
  items,
  openShiftId,
  canOpen,
  canClose,
}: {
  items: Row[];
  openShiftId: string | null;
  canOpen: boolean;
  canClose: boolean;
}) {
  return (
    <div className="grid gap-4">
      <Card className="rounded-2xl">
        <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
          <div className="text-sm text-muted-foreground">Shiftbook untuk kontrol kas dan rekap penjualan per shift.</div>
          <div className="flex gap-2">
            {canOpen ? <OpenShiftDialog disabled={Boolean(openShiftId)} /> : null}
            {canClose ? <CloseShiftDialog shiftId={openShiftId} disabled={!openShiftId} /> : null}
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-2xl border bg-background">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Kasir</TableHead>
              <TableHead>Cabang</TableHead>
              <TableHead>Jam buka</TableHead>
              <TableHead>Jam tutup</TableHead>
              <TableHead className="text-right">Modal awal</TableHead>
              <TableHead className="text-right">Total penjualan</TableHead>
              <TableHead className="text-right">Cash system</TableHead>
              <TableHead className="text-right">Cash counted</TableHead>
              <TableHead className="text-right">Selisih</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="py-10 text-center text-muted-foreground">
                  Belum ada shift.
                </TableCell>
              </TableRow>
            ) : (
              items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs ${statusBadge(s.status)}`}>{s.status}</span>
                  </TableCell>
                  <TableCell className="text-sm">{new Date(s.openedAt).toLocaleDateString("id-ID")}</TableCell>
                  <TableCell className="text-sm">{s.cashierName}</TableCell>
                  <TableCell className="text-sm">{s.branchName}</TableCell>
                  <TableCell className="text-sm">{new Date(s.openedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</TableCell>
                  <TableCell className="text-sm">
                    {s.closedAt ? new Date(s.closedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}
                  </TableCell>
                  <TableCell className="text-right text-sm">{rupiah(s.openingCash)}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{rupiah(s.totalSales)}</TableCell>
                  <TableCell className="text-right text-sm">{rupiah(s.cashSystem)}</TableCell>
                  <TableCell className="text-right text-sm">{s.cashCounted == null ? "-" : rupiah(s.cashCounted)}</TableCell>
                  <TableCell className={`text-right text-sm ${s.cashDifference === 0 ? "" : "text-destructive font-medium"}`}>{rupiah(s.cashDifference)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canClose && s.status === "OPEN" ? (
                        <CloseShiftDialog shiftId={s.id} triggerLabel="Tutup" />
                      ) : null}
                      <Button asChild variant="outline" size="sm" className="rounded-xl">
                        <Link href={`/shifts/${s.id}`}>Detail</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
