import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { listExpiredBatches } from "@/modules/products/expired-service";
import { ExpiredProductTable } from "@/components/products/expired-product-table";

export default async function ExpiredProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; window?: "expired" | "7" | "30" | "90" }>;
}) {
  const ctx = await requirePermission(PERMISSIONS.products_expired_read);
  const sp = await searchParams;

  const q = sp.q ?? null;
  const page = sp.page ? Number(sp.page) : 1;
  const window = sp.window ?? "30";

  const result = await listExpiredBatches({
    tenantId: ctx.tenantId,
    branchId: ctx.branchId,
    window,
    q,
    page: Number.isFinite(page) ? page : 1,
    pageSize: 20,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const prevPage = Math.max(1, result.page - 1);
  const nextPage = Math.min(totalPages, result.page + 1);

  const canExport = ctx.isSuperAdmin || ctx.permissions.includes(PERMISSIONS.products_export);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Expired Product"
        description="Pantau produk yang expired atau hampir expired berdasarkan batch."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="gap-2 rounded-xl">
              <Link href="/products">
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/products/batches">Stock Batch</Link>
            </Button>
            {canExport ? (
              <Button asChild variant="outline" className="gap-2 rounded-xl">
                <a
                  href={`/api/products/export/excel?${new URLSearchParams({
                    expired: window,
                  }).toString()}`}
                >
                  <Download className="h-4 w-4" />
                  Export Excel
                </a>
              </Button>
            ) : null}
          </div>
        }
      />

      <ExpiredProductTable items={result.items} q={result.q} window={window} />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-background p-3 text-sm text-muted-foreground">
        <div>{`Total: ${result.total.toLocaleString("id-ID")} • Page ${result.page}/${totalPages}`}</div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-xl" disabled={result.page <= 1}>
            <Link
              href={`/products/expired?${new URLSearchParams({
                ...(q ? { q } : {}),
                window,
                page: String(prevPage),
              }).toString()}`}
            >
              Prev
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-xl" disabled={result.page >= totalPages}>
            <Link
              href={`/products/expired?${new URLSearchParams({
                ...(q ? { q } : {}),
                window,
                page: String(nextPage),
              }).toString()}`}
            >
              Next
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
