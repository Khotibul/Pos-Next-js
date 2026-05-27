import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { requireActiveTenant } from "@/lib/tenant-guards";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { listBranchOptions } from "@/modules/branches/service";
import { listProductPrices } from "@/modules/products/prices/service";
import { ProductPricesTable } from "@/components/products/product-prices-table";

export default async function ProductPricesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; branchId?: string }>;
}) {
  await requirePermission(PERMISSIONS.products_price_manage);
  const ctx = await requireActiveTenant();
  const sp = await searchParams;

  const q = sp.q ?? null;
  const page = sp.page ? Number(sp.page) : 1;
  const branchId = sp.branchId ?? null;

  const [branches, result] = await Promise.all([
    listBranchOptions({ tenantId: ctx.tenantId }),
    listProductPrices({
      tenantId: ctx.tenantId,
      q,
      branchId,
      page: Number.isFinite(page) ? page : 1,
      pageSize: 20,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const prevPage = Math.max(1, result.page - 1);
  const nextPage = Math.min(totalPages, result.page + 1);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Price Management"
        description="Kelola harga per cabang, grosir/reseller/member, promo period & happy hour (via periode waktu)."
        actions={
          <Button asChild variant="outline" className="gap-2 rounded-xl">
            <Link href="/products">
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Link>
          </Button>
        }
      />

      <ProductPricesTable items={result.items} q={result.q} branches={branches} />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-background p-3 text-sm text-muted-foreground">
        <div>{`Total: ${result.total.toLocaleString("id-ID")} • Page ${result.page}/${totalPages}`}</div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-xl" disabled={result.page <= 1}>
            <Link
              href={`/products/prices?${new URLSearchParams({
                ...(q ? { q } : {}),
                ...(branchId ? { branchId } : {}),
                page: String(prevPage),
              }).toString()}`}
            >
              Prev
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-xl" disabled={result.page >= totalPages}>
            <Link
              href={`/products/prices?${new URLSearchParams({
                ...(q ? { q } : {}),
                ...(branchId ? { branchId } : {}),
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

