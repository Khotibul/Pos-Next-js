import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { listSales } from "@/modules/transactions/service";
import { SalesHistoryTable } from "@/modules/transactions/components/sales-history-table";

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const ctx = await requirePermission(PERMISSIONS.sales_read);
  const sp = await searchParams;
  const q = sp.q ?? null;
  const page = sp.page ? Number(sp.page) : 1;

  const result = await listSales({ tenantId: ctx.tenantId, q, page: Number.isFinite(page) ? page : 1, pageSize: 20 });
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const canDelete = ctx.isSuperAdmin || ctx.permissions.includes(PERMISSIONS.sales_delete);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Penjualan"
        description="Riwayat transaksi penjualan."
        actions={
          <Button asChild className="rounded-xl">
            <Link href="/pos">New Transaction</Link>
          </Button>
        }
      />

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
          total: s.total,
          createdAt: s.createdAt.toISOString(),
        }))}
      />

      <Card>
        <CardContent className="flex items-center justify-between py-4 text-sm text-muted-foreground">
          <div>{`Total: ${result.total} • Page ${result.page}/${totalPages}`}</div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-xl" disabled={result.page <= 1}>
              <Link href={`/sales?${new URLSearchParams({ ...(q ? { q } : {}), page: String(Math.max(1, result.page - 1)) }).toString()}`}>
                Prev
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-xl" disabled={result.page >= totalPages}>
              <Link href={`/sales?${new URLSearchParams({ ...(q ? { q } : {}), page: String(Math.min(totalPages, result.page + 1)) }).toString()}`}>
                Next
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

