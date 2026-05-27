import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { listProducts } from "@/modules/products/service";
import { BarcodeLabelsClient } from "@/components/products/barcode-labels-client";

export default async function ProductBarcodesPage() {
  const ctx = await requirePermission(PERMISSIONS.products_barcode_read);

  const result = await listProducts({ tenantId: ctx.tenantId, page: 1, pageSize: 200 });

  return (
    <div className="grid gap-4">
      <PageHeader title="Barcode Label" description="Generate & cetak label barcode/QR untuk produk." />
      <BarcodeLabelsClient
        products={result.items.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          barcode: p.barcode ?? null,
        }))}
      />
    </div>
  );
}

