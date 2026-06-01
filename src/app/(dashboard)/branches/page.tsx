import { PageHeader } from "@/components/layout/page-header";
import { Building2, CheckCircle2, CircleOff } from "lucide-react";
import { StatCard } from "@/components/layout/stat-card";
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={<Building2 className="h-5 w-5" />} title="Total Cabang" value={overview.total.toLocaleString("id-ID")} description="Outlet, toko, dan gudang" />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} title="Active" value={overview.active.toLocaleString("id-ID")} tone="success" description="Siap transaksi" />
        <StatCard icon={<CircleOff className="h-5 w-5" />} title="Inactive" value={overview.inactive.toLocaleString("id-ID")} tone="slate" description="Cabang nonaktif" />
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
