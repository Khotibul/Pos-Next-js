import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { ProductImportUploader } from "@/components/products/product-import-uploader";

export default async function ProductImportPage() {
  await requirePermission(PERMISSIONS.products_import);

  return (
    <div className="grid gap-4">
      <PageHeader title="Import Produk" description="Import dari Excel/CSV dengan preview, validasi, dan tenant isolation." />
      <ProductImportUploader />
    </div>
  );
}

