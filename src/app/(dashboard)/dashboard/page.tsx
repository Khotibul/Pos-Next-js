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
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { dashboardCopy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

export default async function DashboardHome() {
  const ctx = await requirePermission(PERMISSIONS.dashboard_read);
  const locale = await getRequestLocale();
  const copy = dashboardCopy[locale];
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
    const day =
      (locale === "en"
        ? ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
        : ["MIN", "SEN", "SEL", "RAB", "KAM", "JUM", "SAB"])[dt.getDay()] ?? d.date.slice(5);
    return { label: day, value: d.value };
  });

  function rupiah(n: number) {
    return new Intl.NumberFormat(locale === "en" ? "en-US" : "id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title={copy.operationalSummary}
        description={copy.operationalDescription}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <LanguageSwitcher locale={locale} label={copy.language} description={copy.languageDescription} activeLabel={copy.active} />
            <Button className="gap-2 rounded-xl" asChild>
              <Link href="/reports">
                <Download className="h-4 w-4" />
                {copy.downloadReport}
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Banknote className="h-5 w-5" />} title={copy.totalSales} value={rupiah(kpis.totalSales)} deltaPct={kpis.delta.totalSales} />
        <StatCard icon={<ShoppingCart className="h-5 w-5" />} title={copy.totalTransactions} value={kpis.totalTransactions.toLocaleString(locale === "en" ? "en-US" : "id-ID")} deltaPct={kpis.delta.totalTransactions} />
        <StatCard icon={<Receipt className="h-5 w-5" />} title={copy.averageReceipt} value={rupiah(kpis.avgReceipt)} deltaPct={kpis.delta.avgReceipt} />
        <StatCard icon={<Boxes className="h-5 w-5" />} title={copy.totalProducts} value={overview.total.toLocaleString(locale === "en" ? "en-US" : "id-ID")} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between gap-3 py-4">
            <div>
              <CardTitle className="text-base">{copy.weeklySales}</CardTitle>
              <div className="mt-1 text-sm text-muted-foreground">{copy.weeklySalesDescription}</div>
            </div>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/reports">{copy.viewDetails}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <MiniBarChart data={chartData} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="py-4">
            <CardTitle className="text-base">{copy.topProducts}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {topProducts.length === 0 ? (
              <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">{copy.noData}</div>
            ) : (
              topProducts.map((p: { productId: string; name: string; qty: number; revenue: number }) => (
                <div key={p.productId} className="flex items-center justify-between gap-3 rounded-xl border bg-background p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.qty.toLocaleString(locale === "en" ? "en-US" : "id-ID")} {copy.sold}</div>
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
          <CardTitle className="text-base">{copy.recentTransactions}</CardTitle>
          <Button asChild className="rounded-xl">
            <Link href="/pos/history">{copy.viewAll}</Link>
          </Button>
        </CardHeader>
        <CardContent className="rounded-2xl border bg-background p-0">
          <div className="md:hidden p-4">
            {recent.items.length === 0 ? (
              <div className="rounded-2xl border bg-background p-4 text-sm text-muted-foreground">{copy.noTransactions}</div>
            ) : (
              <div className="grid gap-3">
                {recent.items.map((s: { id: string; invoiceNo: string; createdAt: Date; status: string; total: unknown }) => (
                  <Link
                    key={s.id}
                    href={`/pos/history/${s.id}`}
                    className="flex items-center justify-between gap-4 rounded-3xl border bg-background p-4 shadow-sm transition hover:bg-muted/10"
                  >
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">
                        {copy.transactionId}: <span className="font-mono text-primary">{s.invoiceNo}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleString("id-ID")}</div>
                      <div className="mt-2 inline-flex rounded-full bg-muted px-3 py-1 text-xs">{s.status}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-semibold text-primary">{rupiah(Number(s.total))}</div>
                      <div className="text-xs text-muted-foreground">{copy.detail}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>{copy.transactionId}</TableHead>
                  <TableHead>{copy.time}</TableHead>
                  <TableHead>{copy.status}</TableHead>
                  <TableHead className="text-right">{copy.total}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      {copy.noTransactions}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
