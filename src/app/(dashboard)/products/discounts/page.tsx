import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { requireActiveTenant } from "@/lib/tenant-guards";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { listBranchOptions } from "@/modules/branches/service";
import { listProductDiscounts } from "@/modules/products/discounts/service";
import { ProductDiscountsTable } from "@/components/products/product-discounts-table";

export default async function ProductDiscountsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePermission(PERMISSIONS.products_discount_manage);
  const ctx = await requireActiveTenant();
  const sp = await searchParams;

  const q = sp.q ?? null;
  const page = sp.page ? Number(sp.page) : 1;

  const [branches, bundles, result] = await Promise.all([
    listBranchOptions({ tenantId: ctx.tenantId }),
    prisma.productBundle.findMany({ where: { tenantId: ctx.tenantId, isActive: true }, orderBy: { name: "asc" }, take: 500, select: { id: true, name: true } }),
    listProductDiscounts({ tenantId: ctx.tenantId, q, page: Number.isFinite(page) ? page : 1, pageSize: 20 }),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const prevPage = Math.max(1, result.page - 1);
  const nextPage = Math.min(totalPages, result.page + 1);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Discount Management"
        description="Kelola promo: diskon nominal/persen, BOGO, bundle promo."
        actions={
          <Button asChild variant="outline" className="gap-2 rounded-xl">
            <Link href="/products">
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Link>
          </Button>
        }
      />

      <ProductDiscountsTable items={result.items} q={result.q} branches={branches} bundles={bundles} />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-background p-3 text-sm text-muted-foreground">
        <div>{`Total: ${result.total.toLocaleString("id-ID")} • Page ${result.page}/${totalPages}`}</div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-xl" disabled={result.page <= 1}>
            <Link
              href={`/products/discounts?${new URLSearchParams({
                ...(q ? { q } : {}),
                page: String(prevPage),
              }).toString()}`}
            >
              Prev
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-xl" disabled={result.page >= totalPages}>
            <Link
              href={`/products/discounts?${new URLSearchParams({
                ...(q ? { q } : {}),
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

