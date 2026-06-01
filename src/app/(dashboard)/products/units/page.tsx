import Link from "next/link";
import { ArrowLeft, Ruler } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/layout/stat-card";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { getProductUnitOverview, listProductUnits } from "@/modules/product-units/service";
import { ProductUnitsTable } from "@/modules/product-units/components/product-units-table";

export default async function ProductUnitsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const ctx = await requirePermission(PERMISSIONS.products_read);
  const sp = await searchParams;
  const q = sp.q ?? null;

  const [overview, result] = await Promise.all([
    getProductUnitOverview({ tenantId: ctx.tenantId }),
    listProductUnits({ tenantId: ctx.tenantId, q }),
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Satuan Produk"
        description="Kelola satuan (pcs, box, kg) untuk produk."
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
        <StatCard icon={<Ruler className="h-5 w-5" />} title="Total Satuan" value={overview.total.toLocaleString("id-ID")} description="PCS, box, kg, dan lainnya" />
      </div>

      <ProductUnitsTable q={result.q} items={result.items.map((u) => ({ id: u.id, name: u.name, updatedAt: u.updatedAt.toISOString() }))} />
    </div>
  );
}
