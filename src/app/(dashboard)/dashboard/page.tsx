import Link from "next/link";
import { Banknote, Boxes, Download, Receipt, ShoppingCart } from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getProductOverview } from "@/modules/products/service";
import { StatCard } from "@/components/layout/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MiniBarChart } from "@/components/charts/mini-bar-chart";
import { getSalesKpis, getSalesSeries, getTopProducts, resolvePresetRange } from "@/modules/reports/service";
import { listSales } from "@/modules/transactions/service";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function DashboardHome() {
  const ctx = await requirePermission(PERMISSIONS.dashboard_read);
  const overview = await getProductOverview({ tenantId: ctx.tenantId });
  const range = resolvePresetRange("7d");

  const [kpis, series, topProducts, recent] = await Promise.all([
    getSalesKpis({ tenantId: ctx.tenantId, from: range.from, to: range.to }),
    getSalesSeries({ tenantId: ctx.tenantId, from: range.from, to: range.to }),
    getTopProducts({ tenantId: ctx.tenantId, from: range.from, to: range.to, take: 4 }),
    listSales({ tenantId: ctx.tenantId, page: 1, pageSize: 5 }),
  ] as const);

  const chartData = series.slice(-7).map((d) => {
    const dt = new Date(d.date);
    const day = ["MIN", "SEN", "SEL", "RAB", "KAM", "JUM", "SAB"][dt.getDay()] ?? d.date.slice(5);
    return { label: day, value: d.value };
  });

  function rupiah(n: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Ringkasan Operasional"
        description="Pantau performa bisnis Anda secara real-time hari ini."
        actions={
          <div className="flex items-center gap-2">
            <Button className="gap-2 rounded-xl" asChild>
              <Link href="/reports">
                <Download className="h-4 w-4" />
                Unduh Laporan
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Banknote className="h-5 w-5" />} title="Total Penjualan" value={rupiah(kpis.totalSales)} deltaPct={kpis.delta.totalSales} />
        <StatCard icon={<ShoppingCart className="h-5 w-5" />} title="Total Transaksi" value={kpis.totalTransactions.toLocaleString("id-ID")} deltaPct={kpis.delta.totalTransactions} />
        <StatCard icon={<Receipt className="h-5 w-5" />} title="Rata-rata Struk" value={rupiah(kpis.avgReceipt)} deltaPct={kpis.delta.avgReceipt} />
        <StatCard icon={<Boxes className="h-5 w-5" />} title="Total Produk" value={overview.total.toLocaleString("id-ID")} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between gap-3 py-4">
            <div>
              <CardTitle className="text-base">Penjualan Minggu Ini</CardTitle>
              <div className="mt-1 text-sm text-muted-foreground">Data harian perbandingan volume transaksi</div>
            </div>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/reports">Lihat Detail</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <MiniBarChart data={chartData} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="py-4">
            <CardTitle className="text-base">Produk Terlaris</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {topProducts.length === 0 ? (
              <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">Belum ada data.</div>
            ) : (
              topProducts.map((p: { productId: string; name: string; qty: number; revenue: number }) => (
                <div key={p.productId} className="flex items-center justify-between gap-3 rounded-xl border bg-background p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.qty.toLocaleString("id-ID")} terjual</div>
                  </div>
                  <div className="text-sm font-semibold text-primary">{rupiah(p.revenue)}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 py-4">
          <CardTitle className="text-base">Transaksi Terakhir</CardTitle>
          <Button asChild className="rounded-xl">
            <Link href="/pos/history">Lihat Semua</Link>
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto rounded-2xl border bg-background p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>ID Transaksi</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    Belum ada transaksi.
                  </TableCell>
                </TableRow>
              ) : (
                recent.items.map((s: { id: string; invoiceNo: string; createdAt: Date; status: string; total: unknown }) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs text-primary">{s.invoiceNo}</TableCell>
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
  );
}
