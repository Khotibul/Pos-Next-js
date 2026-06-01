import Link from "next/link";
import { ArrowLeft, Tags } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/layout/stat-card";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { getProductCategoryOverview, listProductCategories } from "@/modules/product-categories/service";
import { ProductCategoriesTable } from "@/modules/product-categories/components/product-categories-table";

export default async function ProductCategoriesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const ctx = await requirePermission(PERMISSIONS.products_read);
  const sp = await searchParams;
  const q = sp.q ?? null;

  const [overview, result] = await Promise.all([
    getProductCategoryOverview({ tenantId: ctx.tenantId }),
    listProductCategories({ tenantId: ctx.tenantId, q }),
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Kategori Produk"
        description="Kelola kategori untuk mempermudah filter dan laporan."
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
        <StatCard icon={<Tags className="h-5 w-5" />} title="Total Kategori" value={overview.total.toLocaleString("id-ID")} description="Group produk aktif" />
      </div>

      <ProductCategoriesTable
        q={result.q}
        items={result.items.map((c) => ({ id: c.id, name: c.name, updatedAt: c.updatedAt.toISOString() }))}
      />
    </div>
  );
}
