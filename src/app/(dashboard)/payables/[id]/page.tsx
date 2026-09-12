import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PERMISSIONS } from "@/shared/constants/permissions";
import { requirePermission } from "@/shared/server/auth/permissions";
import { getPayableById } from "@/features/payables/data/service";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function PayableDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePermission(PERMISSIONS.payables_read);
  const { id } = await params;
  let data: Awaited<ReturnType<typeof getPayableById>>;
  try {
    data = await getPayableById({ tenantId: ctx.tenantId, id });
  } catch {
    notFound();
  }

  const fmt = (n: number) => n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm" className="rounded-xl"><Link href="/payables"><ArrowLeft className="h-4 w-4 mr-1" /> Kembali</Link></Button>
      </div>
      <PageHeader title={`Utang ${data.invoiceNo}`} description={data.description ?? `Supplier: ${data.supplierName ?? "-"}`} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total</CardTitle></CardHeader><CardContent className="text-xl font-bold">{fmt(data.totalAmount)}</CardContent></Card>
        <Card className="rounded-2xl"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Dibayar</CardTitle></CardHeader><CardContent className="text-xl font-bold text-emerald-600">{fmt(data.paidAmount)}</CardContent></Card>
        <Card className="rounded-2xl"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Sisa</CardTitle></CardHeader><CardContent className="text-xl font-bold">{fmt(data.remainingAmount)}</CardContent></Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">Info Utang</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><span className="font-mono font-medium">{data.invoiceNo}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Supplier</span><span>{data.supplierName ?? "-"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-semibold">{data.status}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Jatuh Tempo</span><span>{data.dueDate ? new Date(data.dueDate).toLocaleDateString("id-ID") : "-"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">PO ID</span><span className="font-mono text-xs">{data.purchaseOrderId ?? "-"}</span></div>
          {data.notes ? <div className="rounded-xl bg-muted/40 p-3 text-xs">{data.notes}</div> : null}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">Riwayat Pembayaran ({data.payments.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead>Referensi</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.payments.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Belum ada pembayaran.</TableCell></TableRow>
                ) : data.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs">{new Date(p.paidAt).toLocaleString("id-ID")}</TableCell>
                    <TableCell className="font-semibold">{fmt(p.amount)}</TableCell>
                    <TableCell><span className="rounded-full bg-muted px-2 py-1 text-xs">{p.method}</span></TableCell>
                    <TableCell className="text-xs">{p.reference ?? "-"}</TableCell>
                    <TableCell className="text-xs">{p.notes ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
