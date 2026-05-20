import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="grid gap-2 py-5">
            <div className="text-sm text-muted-foreground">Total Satuan</div>
            <div className="text-3xl font-semibold tracking-tight">{overview.total.toLocaleString("id-ID")}</div>
          </CardContent>
        </Card>
      </div>

      <ProductUnitsTable q={result.q} items={result.items.map((u) => ({ id: u.id, name: u.name, updatedAt: u.updatedAt.toISOString() }))} />
    </div>
  );
}

