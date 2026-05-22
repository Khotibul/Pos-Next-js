import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { listSales } from "@/modules/transactions/service";
import { SalesHistoryTable } from "@/modules/transactions/components/sales-history-table";
import { SalesMobileList } from "@/modules/transactions/components/sales-mobile-list";
import { Search } from "lucide-react";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}) {
  const ctx = await requirePermission(PERMISSIONS.sales_read);
  const sp = await searchParams;
  const q = sp.q ?? null;
  const page = sp.page ? Number(sp.page) : 1;
  const status = sp.status === "PAID" || sp.status === "VOID" ? sp.status : null;

  const result = await listSales({
    tenantId: ctx.tenantId,
    q,
    status,
    page: Number.isFinite(page) ? page : 1,
    pageSize: 20,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const prevPage = Math.max(1, result.page - 1);
  const nextPage = Math.min(totalPages, result.page + 1);
  const canDelete = ctx.isSuperAdmin || ctx.permissions.includes(PERMISSIONS.sales_delete);

  const chipHref = (nextStatus: string | null) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (nextStatus) params.set("status", nextStatus);
    params.set("page", "1");
    return `/sales?${params.toString()}`;
  };

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Transaksi"
        description="Riwayat transaksi penjualan."
        actions={
          <Button asChild className="rounded-xl">
            <Link href="/pos">New Transaction</Link>
          </Button>
        }
      />

      <div className="md:hidden">
        <Card className="rounded-3xl">
          <CardContent className="grid gap-3 p-4">
            <div className="text-xs tracking-wider text-muted-foreground">FINANCIAL OVERVIEW</div>
            <div className="text-2xl font-semibold tracking-tight">Transactions</div>

            <form className="mt-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  name="q"
                  defaultValue={result.q ?? ""}
                  placeholder="Search by ID..."
                  className="h-12 w-full rounded-2xl border bg-background pl-10 pr-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              {status ? <input type="hidden" name="status" value={status} /> : null}
            </form>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { label: "All", value: null },
                { label: "Success", value: "PAID" },
                { label: "Failed", value: "VOID" },
              ].map((c) => {
                const active = (status ?? null) === c.value;
                return (
                  <Link
                    key={c.label}
                    href={chipHref(c.value)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold ${
                      active ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    {c.label}
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="mt-4">
          <SalesMobileList
            items={result.items.map((s) => ({
              id: s.id,
              invoiceNo: s.invoiceNo,
              status: s.status,
              total: s.total,
              createdAt: s.createdAt.toISOString(),
            }))}
          />
        </div>

        <div className="mt-4 flex gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1 rounded-xl" disabled={result.page <= 1}>
            <Link
              href={`/sales?${new URLSearchParams({
                ...(q ? { q } : {}),
                ...(status ? { status } : {}),
                page: String(prevPage),
              }).toString()}`}
            >
              Prev
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="flex-1 rounded-xl" disabled={result.page >= totalPages}>
            <Link
              href={`/sales?${new URLSearchParams({
                ...(q ? { q } : {}),
                ...(status ? { status } : {}),
                page: String(nextPage),
              }).toString()}`}
            >
              Next
            </Link>
          </Button>
        </div>

        <Card className="mt-4 rounded-3xl overflow-hidden">
          <CardContent className="relative p-0">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/20" />
            <div className="relative p-5 text-primary-foreground">
              <div className="text-base font-semibold">End of Day Report</div>
              <div className="mt-1 text-sm text-primary-foreground/85">Generate your daily summary now.</div>
              <div className="mt-4">
                <Button asChild variant="secondary" className="rounded-xl">
                  <Link href="/reports">Buka Laporan</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="hidden md:block">
        <Card>
          <CardContent className="py-4">
            <form className="flex flex-wrap gap-2">
              <input
                name="q"
                defaultValue={result.q ?? ""}
                placeholder="Cari invoice..."
                className="h-11 w-full max-w-md rounded-xl border bg-background px-3 text-sm"
              />
              <Button type="submit" variant="outline" className="rounded-xl">
                Cari
              </Button>
            </form>
          </CardContent>
        </Card>

        <SalesHistoryTable
          canDelete={canDelete}
          items={result.items.map((s) => ({
            id: s.id,
            invoiceNo: s.invoiceNo,
            status: s.status,
            total: Number(s.total),
            createdAt: s.createdAt.toISOString(),
          }))}
        />

        <Card>
          <CardContent className="flex items-center justify-between py-4 text-sm text-muted-foreground">
            <div>{`Total: ${result.total} • Page ${result.page}/${totalPages}`}</div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-xl" disabled={result.page <= 1}>
                <Link
                  href={`/sales?${new URLSearchParams({
                    ...(q ? { q } : {}),
                    ...(status ? { status } : {}),
                    page: String(Math.max(1, result.page - 1)),
                  }).toString()}`}
                >
                  Prev
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-xl" disabled={result.page >= totalPages}>
                <Link
                  href={`/sales?${new URLSearchParams({
                    ...(q ? { q } : {}),
                    ...(status ? { status } : {}),
                    page: String(Math.min(totalPages, result.page + 1)),
                  }).toString()}`}
                >
                  Next
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
