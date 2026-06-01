import Link from "next/link";
import { ArrowLeft, Tags } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/layout/stat-card";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { getBranchCategoryOverview, listBranchCategories } from "@/modules/branch-categories/service";
import { BranchCategoriesTable } from "@/modules/branch-categories/components/branch-categories-table";

export default async function BranchCategoriesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const ctx = await requirePermission(PERMISSIONS.branches_read);
  const sp = await searchParams;
  const q = sp.q ?? null;

  const [overview, result] = await Promise.all([
    getBranchCategoryOverview({ tenantId: ctx.tenantId }),
    listBranchCategories({ tenantId: ctx.tenantId, q }),
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Kategori Cabang"
        description="Kelola kategori cabang untuk grouping outlet."
        actions={
          <Button asChild variant="outline" className="gap-2 rounded-xl">
            <Link href="/branches">
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Tags className="h-5 w-5" />} title="Total Kategori" value={overview.total.toLocaleString("id-ID")} description="Pengelompokan outlet" />
      </div>

      <BranchCategoriesTable
        q={result.q}
        items={result.items.map((c) => ({ id: c.id, name: c.name, updatedAt: c.updatedAt.toISOString() }))}
      />
    </div>
  );
}
