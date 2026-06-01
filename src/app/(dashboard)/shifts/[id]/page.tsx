import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { Errors } from "@/lib/errors";
import { getShiftDetail } from "@/modules/shifts/service";
import { ShiftSummaryCard } from "@/components/shifts/shift-summary-card";
import { CloseShiftDialog } from "@/components/shifts/close-shift-dialog";
import { approveShiftAction } from "@/modules/shifts/actions";

async function approveShiftFormAction(formData: FormData) {
  "use server";
  await approveShiftAction(null, formData);
}

function rupiah(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
}

export default async function ShiftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePermission(PERMISSIONS.transactions_shift_read);
  const p = await params;

  const detail = await getShiftDetail({ tenantId: ctx.tenantId, shiftId: p.id });
  const shift = detail.shift as {
    id: string;
    status: string;
    openedAt: Date;
    closedAt: Date | null;
    openingCash: unknown;
    cashSystem: unknown;
    cashCounted: unknown | null;
    cashDifference: unknown;
    openNote: string | null;
    closeNote: string | null;
    cashierId: string;
    cashier: { id: string; name: string | null; email: string | null };
    branch: { id: string; name: string; code: string | null };
  };
  const summary = detail.summary as {
    totalSales: number;
    totalCash: number;
    totalQris: number;
    totalTransfer: number;
    totalEwallet: number;
    transactionCount: number;
    cashSystem: number;
  };
  const sales = detail.sales as Array<{ id: string; invoiceNo: string; status: string; total: unknown; createdAt: Date }>;

  const can = (perm: string) => ctx.isSuperAdmin || ctx.permissions.includes(perm);
  const canManageAllShifts = ctx.isSuperAdmin || ["OWNER", "ADMIN", "BRANCH_MANAGER"].includes(ctx.roleName ?? "");
  if (!canManageAllShifts && shift.cashierId !== ctx.userId) throw Errors.forbidden("Anda hanya bisa melihat shift milik Anda sendiri.");
  const canClose = can(PERMISSIONS.transactions_shift_close) && shift.status === "OPEN" && (canManageAllShifts || shift.cashierId === ctx.userId);
  const canApprove = can(PERMISSIONS.transactions_shift_approve) && shift.status !== "OPEN" && shift.status !== "APPROVED";

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Detail Shift"
        description={`${shift.branch.name} • ${shift.cashier.name ?? shift.cashier.email ?? shift.cashier.id}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="gap-2 rounded-xl">
              <Link href="/shifts">
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Link>
            </Button>
            <CloseShiftDialog shiftId={shift.id} disabled={!canClose} triggerLabel="Tutup Shift" />
            {canApprove ? (
              <form action={approveShiftFormAction}>
                <input type="hidden" name="shiftId" value={shift.id} />
                <Button type="submit" className="gap-2 rounded-xl">
                  <CheckCircle2 className="h-4 w-4" />
                  Approve
                </Button>
              </form>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader className="py-4">
            <CardTitle className="text-base">Info Shift</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium">{shift.status}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Opened</span>
              <span className="font-medium">{new Date(shift.openedAt).toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Closed</span>
              <span className="font-medium">{shift.closedAt ? new Date(shift.closedAt).toLocaleString("id-ID") : "-"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Opening cash</span>
              <span className="font-medium">{rupiah(shift.openingCash)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Cash system</span>
              <span className="font-medium">{rupiah(shift.cashSystem)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Cash counted</span>
              <span className="font-medium">{shift.cashCounted == null ? "-" : rupiah(shift.cashCounted)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Selisih</span>
              <span className={`font-semibold ${Number(shift.cashDifference) === 0 ? "" : "text-destructive"}`}>{rupiah(shift.cashDifference)}</span>
            </div>
            {shift.openNote ? (
              <div className="mt-3 rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
                <div className="font-medium text-foreground">Catatan buka</div>
                <div className="mt-1">{shift.openNote}</div>
              </div>
            ) : null}
            {shift.closeNote ? (
              <div className="rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
                <div className="font-medium text-foreground">Catatan tutup</div>
                <div className="mt-1">{shift.closeNote}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:col-span-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ShiftSummaryCard title="Total sales" value={rupiah(summary.totalSales)} tone="primary" />
            <ShiftSummaryCard title="Total cash" value={rupiah(summary.totalCash)} />
            <ShiftSummaryCard title="Total QRIS" value={rupiah(summary.totalQris)} />
            <ShiftSummaryCard title="Jumlah transaksi" value={summary.transactionCount.toLocaleString("id-ID")} />
            <ShiftSummaryCard title="Total transfer" value={rupiah(summary.totalTransfer)} />
            <ShiftSummaryCard title="Total e-wallet" value={rupiah(summary.totalEwallet)} />
            <ShiftSummaryCard title="Selisih kas" value={rupiah(Number(shift.cashDifference))} tone={Number(shift.cashDifference) === 0 ? "default" : "danger"} />
            <ShiftSummaryCard title="Cash system" value={rupiah(summary.cashSystem)} />
          </div>

          <Card className="rounded-2xl">
            <CardHeader className="py-4">
              <CardTitle className="text-base">Transaksi dalam Shift</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto rounded-2xl border bg-background p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                        Belum ada transaksi pada shift ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs text-primary">
                          <Link href={`/pos/history/${s.id}`} className="hover:underline">
                            {s.invoiceNo}
                          </Link>
                        </TableCell>
                        <TableCell>{new Date(s.createdAt).toLocaleString("id-ID")}</TableCell>
                        <TableCell>{s.status}</TableCell>
                        <TableCell className="text-right font-medium">{rupiah(Number(s.total))}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
