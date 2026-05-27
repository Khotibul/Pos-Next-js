import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { listProductMeta } from "@/modules/products/service";
import { ProductExportClient } from "@/components/products/product-export-client";

export default async function ProductExportPage() {
  const ctx = await requirePermission(PERMISSIONS.products_export);
  const meta = await listProductMeta({ tenantId: ctx.tenantId });

  return (
    <div className="grid gap-4">
      <PageHeader title="Export Produk" description="Export ke CSV/Excel/PDF dengan filter." />
      <Card className="rounded-3xl">
        <CardContent className="p-4">
          <ProductExportClient meta={meta} />
        </CardContent>
      </Card>
    </div>
  );
}

