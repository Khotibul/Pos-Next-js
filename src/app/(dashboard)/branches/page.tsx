import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { listBranches, getBranchOverview, listBranchMeta } from "@/modules/branches/service";
import { BranchesTable } from "@/modules/branches/components/branches-table";

export default async function BranchesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoryId?: string }>;
}) {
  const ctx = await requirePermission(PERMISSIONS.branches_read);
  const sp = await searchParams;
  const q = sp.q ?? "";
  const categoryId = sp.categoryId ?? "";

  const [overview, meta, result] = await Promise.all([
    getBranchOverview({ tenantId: ctx.tenantId }),
    listBranchMeta({ tenantId: ctx.tenantId }),
    listBranches({ tenantId: ctx.tenantId, q, categoryId }),
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader title="Cabang" description="Kelola multi-cabang per tenant (outlet/toko/gudang)." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="grid gap-2 py-5">
            <div className="text-sm text-muted-foreground">Total Cabang</div>
            <div className="text-3xl font-semibold tracking-tight">{overview.total.toLocaleString("id-ID")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="grid gap-2 py-5">
            <div className="text-sm text-muted-foreground">Active</div>
            <div className="text-3xl font-semibold tracking-tight">{overview.active.toLocaleString("id-ID")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="grid gap-2 py-5">
            <div className="text-sm text-muted-foreground">Inactive</div>
            <div className="text-3xl font-semibold tracking-tight">{overview.inactive.toLocaleString("id-ID")}</div>
          </CardContent>
        </Card>
      </div>

      <BranchesTable
        query={{ q: result.q ?? "", categoryId: result.categoryId ?? "" }}
        categories={meta.categories}
        items={result.items.map((b) => ({
          id: b.id,
          name: b.name,
          code: b.code,
          categoryId: b.categoryId,
          categoryName: b.category?.name ?? "-",
          phone: b.phone,
          address: b.address,
          isActive: b.isActive,
          updatedAt: b.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}

