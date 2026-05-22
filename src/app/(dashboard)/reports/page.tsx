import Link from "next/link";
import { Banknote, Download, Package, Receipt, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { MiniBarChart } from "@/components/charts/mini-bar-chart";
import { RangeTabs } from "@/modules/reports/components/range-tabs";
import { SalesReportQuerySchema } from "@/modules/reports/validators";
import { getSalesKpis, getSalesSeries, getTopProducts, listSalesForReport, resolvePresetRange, type ReportPreset } from "@/modules/reports/service";

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function parseDateInput(v?: string | null) {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-").map((x) => Number(x));
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }
  const dt = new Date(v);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string; q?: string; page?: string }>;
}) {
  const ctx = await requirePermission(PERMISSIONS.reports_read);
  const sp = await searchParams;
  const parsed = SalesReportQuerySchema.safeParse(sp);
  const q = parsed.success ? (parsed.data.q?.trim() || null) : null;
  const preset = (parsed.success ? parsed.data.preset : "7d") as ReportPreset;
  const page = parsed.success ? parsed.data.page : 1;

  const from = parseDateInput(parsed.success ? parsed.data.from : null);
  const to = parseDateInput(parsed.success ? parsed.data.to : null);
  const range = resolvePresetRange(preset, { from, to });

  const [kpis, series, topProducts, history] = await Promise.all([
    getSalesKpis({ tenantId: ctx.tenantId, from: range.from, to: range.to }),
    getSalesSeries({ tenantId: ctx.tenantId, from: range.from, to: range.to }),
    getTopProducts({ tenantId: ctx.tenantId, from: range.from, to: range.to, take: 4 }),
    listSalesForReport({ tenantId: ctx.tenantId, from: range.from, to: range.to, q, page, pageSize: 10 }),
  ]);

  const totalPages = Math.max(1, Math.ceil(history.total / history.pageSize));
  const prevPage = Math.max(1, history.page - 1);
  const nextPage = Math.min(totalPages, history.page + 1);

  const csvHref = `/api/reports/sales.csv?${new URLSearchParams({
    preset,
    ...(sp.from ? { from: sp.from } : {}),
    ...(sp.to ? { to: sp.to } : {}),
    ...(q ? { q } : {}),
  }).toString()}`;

  const chartData = series.slice(-7).map((d) => {
    const dt = new Date(d.date);
    const day = ["MIN", "SEN", "SEL", "RAB", "KAM", "JUM", "SAB"][dt.getDay()] ?? d.date.slice(5);
    return { label: day, value: d.value };
  });

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Laporan Penjualan"
        description="Pantau performa bisnis Anda secara real-time."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <RangeTabs />
            <Button asChild variant="outline" className="gap-2 rounded-xl">
              <Link href={csvHref}>
                <Download className="h-4 w-4" />
                Ekspor CSV
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Banknote className="h-5 w-5" />} title="Total Penjualan" value={rupiah(kpis.totalSales)} deltaPct={kpis.delta.totalSales} />
        <StatCard icon={<ShoppingCart className="h-5 w-5" />} title="Total Transaksi" value={kpis.totalTransactions.toLocaleString("id-ID")} deltaPct={kpis.delta.totalTransactions} />
        <StatCard icon={<Package className="h-5 w-5" />} title="Item Terjual" value={kpis.itemsSold.toLocaleString("id-ID")} deltaPct={kpis.delta.itemsSold} />
        <StatCard icon={<Receipt className="h-5 w-5" />} title="Rata-rata Struk" value={rupiah(kpis.avgReceipt)} deltaPct={kpis.delta.avgReceipt} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between gap-3 py-4">
            <div>
              <CardTitle className="text-base">Penjualan Minggu Ini</CardTitle>
              <div className="mt-1 text-sm text-muted-foreground">Data harian perbandingan volume transaksi</div>
            </div>
            <div className="text-sm text-muted-foreground">{range.label}</div>
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
              topProducts.map((p) => (
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
          <CardTitle className="text-base">Riwayat Transaksi</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={csvHref}>Ekspor CSV</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <form className="flex flex-wrap gap-2">
            <input
              name="q"
              defaultValue={history.q ?? ""}
              placeholder="Cari invoice..."
              className="h-11 w-full max-w-md rounded-xl border bg-background px-3 text-sm"
            />
            <input type="hidden" name="preset" value={preset} />
            {sp.from ? <input type="hidden" name="from" value={sp.from} /> : null}
            {sp.to ? <input type="hidden" name="to" value={sp.to} /> : null}
            <Button type="submit" variant="outline" className="rounded-xl">
              Cari
            </Button>
          </form>

          <div className="md:hidden">
            <div className="grid gap-3">
              {history.items.length === 0 ? (
                <div className="rounded-2xl border bg-background p-4 text-sm text-muted-foreground">
                  Belum ada transaksi pada rentang ini.
                </div>
              ) : (
                history.items.map((s) => (
                  <Link
                    key={s.id}
                    href={`/pos/history/${s.id}`}
                    className="flex items-center justify-between gap-4 rounded-3xl border bg-background p-4 shadow-sm transition hover:bg-muted/10"
                  >
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">
                        ID: <span className="font-mono text-primary">{s.invoiceNo}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleString("id-ID")}</div>
                      <div className="mt-2 inline-flex rounded-full bg-muted px-3 py-1 text-xs">{s.status}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-semibold text-primary">{rupiah(Number(s.total))}</div>
                      <div className="text-xs text-muted-foreground">Detail</div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto rounded-2xl border bg-background">
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
                {history.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      Belum ada transaksi pada rentang ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  history.items.map((s) => (
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
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Menampilkan {history.items.length} dari {history.total} transaksi • Page {history.page}/{totalPages}
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-xl" disabled={history.page <= 1}>
                <Link
                  href={`/reports?${new URLSearchParams({
                    preset,
                    ...(sp.from ? { from: sp.from } : {}),
                    ...(sp.to ? { to: sp.to } : {}),
                    ...(q ? { q } : {}),
                    page: String(prevPage),
                  }).toString()}`}
                >
                  Prev
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-xl" disabled={history.page >= totalPages}>
                <Link
                  href={`/reports?${new URLSearchParams({
                    preset,
                    ...(sp.from ? { from: sp.from } : {}),
                    ...(sp.to ? { to: sp.to } : {}),
                    ...(q ? { q } : {}),
                    page: String(nextPage),
                  }).toString()}`}
                >
                  Next
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
