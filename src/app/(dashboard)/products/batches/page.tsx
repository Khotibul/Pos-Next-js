import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { listProductBatches } from "@/modules/products/batches/service";
import { ProductBatchesTable } from "@/components/products/product-batches-table";

export default async function ProductBatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; window?: "expired" | "7" | "30" | "90" }>;
}) {
  const ctx = await requirePermission(PERMISSIONS.products_expired_read);
  const sp = await searchParams;

  const q = sp.q ?? null;
  const page = sp.page ? Number(sp.page) : 1;
  const window = sp.window ?? null;

  const result = await listProductBatches({
    tenantId: ctx.tenantId,
    branchId: ctx.branchId,
    q,
    window,
    page: Number.isFinite(page) ? page : 1,
    pageSize: 20,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const prevPage = Math.max(1, result.page - 1);
  const nextPage = Math.min(totalPages, result.page + 1);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Stock Batch"
        description="Kelola batch number & expired date untuk alert produk expired."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="gap-2 rounded-xl">
              <Link href="/products">
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/products/expired">Expired</Link>
            </Button>
          </div>
        }
      />

      <ProductBatchesTable items={result.items} q={result.q} />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-background p-3 text-sm text-muted-foreground">
        <div>{`Total: ${result.total.toLocaleString("id-ID")} • Page ${result.page}/${totalPages}`}</div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-xl" disabled={result.page <= 1}>
            <Link
              href={`/products/batches?${new URLSearchParams({
                ...(q ? { q } : {}),
                ...(window ? { window } : {}),
                page: String(prevPage),
              }).toString()}`}
            >
              Prev
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-xl" disabled={result.page >= totalPages}>
            <Link
              href={`/products/batches?${new URLSearchParams({
                ...(q ? { q } : {}),
                ...(window ? { window } : {}),
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

