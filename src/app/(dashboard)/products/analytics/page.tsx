import Link from "next/link";
import { AlertTriangle, ArrowLeft, Boxes, CalendarX, PackageX, TrendingDown, TrendingUp } from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { requireActiveTenant } from "@/lib/tenant-guards";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MiniBarChart } from "@/components/charts/mini-bar-chart";
import { getProductAnalytics } from "@/modules/products/analytics-service";
import { StatCard } from "@/components/layout/stat-card";

function fmtMoney(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export default async function ProductAnalyticsPage() {
  await requirePermission(PERMISSIONS.products_analytics_read);
  const ctx = await requireActiveTenant();
  const canAi = ctx.isSuperAdmin || ctx.permissions.includes(PERMISSIONS.products_ai_read);

  const data = await getProductAnalytics({ tenantId: ctx.tenantId, branchId: ctx.branchId });

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Product Analytics"
        description="Ringkasan performa produk, stok, expired, dan rekomendasi (heuristic)."
        actions={
          <Button asChild variant="outline" className="gap-2 rounded-xl">
            <Link href="/products">
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Boxes className="h-5 w-5" />} title="Total Produk" value={data.overview.totalProducts.toLocaleString("id-ID")} description="Produk dalam katalog" />
        <StatCard icon={<PackageX className="h-5 w-5" />} title="Out of Stock" value={data.overview.outOfStock.toLocaleString("id-ID")} tone="danger" description="Perlu restock cepat" />
        <StatCard icon={<AlertTriangle className="h-5 w-5" />} title="Low Stock" value={data.overview.lowStock.toLocaleString("id-ID")} tone="warning" description="Mendekati minimum" />
        <StatCard icon={<CalendarX className="h-5 w-5" />} title="Expired Batch" value={data.overview.expiredBatches.toLocaleString("id-ID")} tone="danger" description="Batch sudah kedaluwarsa" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-3xl lg:col-span-2">
          <CardContent className="grid gap-3 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Product sales trend (7 hari)</div>
              <Badge variant="secondary">Omzet</Badge>
            </div>
            <MiniBarChart data={data.charts.salesTrend7d} />
          </CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardContent className="grid gap-2 p-4">
            <div className="text-sm font-semibold">Inventory valuation</div>
            <div className="text-2xl font-semibold">{fmtMoney(data.overview.inventoryValuation)}</div>
            <div className="text-xs text-muted-foreground">Perkiraan: stok (branch) × cost price.</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border bg-muted/10 p-3">
                <div className="text-xs text-muted-foreground">Expiring 7d</div>
                <div className="text-lg font-semibold">{data.overview.expiring7d}</div>
              </div>
              <div className="rounded-2xl border bg-muted/10 p-3">
                <div className="text-xs text-muted-foreground">Expiring 30d</div>
                <div className="text-lg font-semibold">{data.overview.expiring30d}</div>
              </div>
            </div>
            <Button asChild variant="outline" className="mt-2 rounded-xl">
              <Link href="/products/expired">Lihat expired</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-3xl">
          <CardContent className="grid gap-3 p-4">
            <div className="text-sm font-semibold">Top kategori (30 hari)</div>
            <MiniBarChart data={data.charts.topCategories.map((c) => ({ label: c.label.slice(0, 6), value: c.value }))} />
            <div className="text-xs text-muted-foreground">Top 8 berdasarkan omzet.</div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardContent className="grid gap-3 p-4">
            <div className="text-sm font-semibold">Top brand (30 hari)</div>
            <MiniBarChart data={data.charts.topBrands.map((c) => ({ label: c.label.slice(0, 6), value: c.value }))} />
            <div className="text-xs text-muted-foreground">Top 8 berdasarkan omzet.</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-3xl">
          <CardContent className="grid gap-3 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Top revenue products</div>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            {data.top.revenueProducts.length === 0 ? (
              <div className="rounded-2xl border bg-muted/10 p-4 text-sm text-muted-foreground">Belum ada data.</div>
            ) : (
              <div className="grid gap-2">
                {data.top.revenueProducts.map((p) => (
                  <div key={p.productId} className="flex items-center justify-between gap-3 rounded-2xl border bg-background p-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.qty} item</div>
                    </div>
                    <div className="text-sm font-semibold text-primary">{fmtMoney(p.revenue)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardContent className="grid gap-3 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Top margin products</div>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            {data.top.marginProducts.length === 0 ? (
              <div className="rounded-2xl border bg-muted/10 p-4 text-sm text-muted-foreground">Belum ada data.</div>
            ) : (
              <div className="grid gap-2">
                {data.top.marginProducts.map((p) => (
                  <div key={p.productId} className="flex items-center justify-between gap-3 rounded-2xl border bg-background p-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.qty} item</div>
                    </div>
                    <div className="text-sm font-semibold">{fmtMoney(p.margin)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {canAi ? (
        <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-3xl lg:col-span-1">
          <CardContent className="grid gap-3 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">AI: Slow moving</div>
              <TrendingDown className="h-4 w-4 text-rose-600" />
            </div>
            {data.ai.slowMoving.length === 0 ? (
              <div className="rounded-2xl border bg-muted/10 p-4 text-sm text-muted-foreground">Belum ada data.</div>
            ) : (
              <div className="grid gap-2">
                {data.ai.slowMoving.map((p) => (
                  <div key={p.productId} className="rounded-2xl border bg-background p-3">
                    <div className="truncate text-sm font-medium">{p.name}</div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Stock: {p.stock}</span>
                      <span>Sold 30d: {p.sold30d}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl lg:col-span-1">
          <CardContent className="grid gap-3 p-4">
            <div className="text-sm font-semibold">AI: Reorder suggestion</div>
            {data.ai.reorderSuggestions.length === 0 ? (
              <div className="rounded-2xl border bg-muted/10 p-4 text-sm text-muted-foreground">Belum ada data.</div>
            ) : (
              <div className="grid gap-2">
                {data.ai.reorderSuggestions.map((p) => (
                  <div key={p.productId} className="rounded-2xl border bg-background p-3">
                    <div className="truncate text-sm font-medium">{p.name}</div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Stock: {p.stock}</span>
                      <span>Avg/day: {p.avgDailySold}</span>
                    </div>
                    <div className="mt-1 text-sm font-semibold text-primary">Suggest: {p.suggestedQty}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl lg:col-span-1">
          <CardContent className="grid gap-3 p-4">
            <div className="text-sm font-semibold">AI: Promo suggestion</div>
            {data.ai.promoSuggestions.length === 0 ? (
              <div className="rounded-2xl border bg-muted/10 p-4 text-sm text-muted-foreground">Belum ada data.</div>
            ) : (
              <div className="grid gap-2">
                {data.ai.promoSuggestions.map((p) => (
                  <div key={p.productId} className="rounded-2xl border bg-background p-3">
                    <div className="truncate text-sm font-medium">{p.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{p.suggestion}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      ) : (
        <Card className="rounded-3xl">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Anda tidak punya izin untuk melihat AI recommendations. Minta admin mengaktifkan permission <span className="font-mono">products.ai.read</span>.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
