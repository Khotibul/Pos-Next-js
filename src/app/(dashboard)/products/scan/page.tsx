import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ProductScanClient } from "@/components/products/product-scan-client";

export default async function ProductScanPage() {
  await requirePermission(PERMISSIONS.products_barcode_read);
  return (
    <div className="grid gap-4">
      <PageHeader title="Scan Barcode" description="Scan barcode/QR untuk mencari produk dengan cepat." />
      <Card className="rounded-3xl">
        <CardContent className="p-4">
          <ProductScanClient />
        </CardContent>
      </Card>
    </div>
  );
}

