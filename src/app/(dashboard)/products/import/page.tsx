import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { ProductImportUploader } from "@/components/products/product-import-uploader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ProductImportPage() {
  await requirePermission(PERMISSIONS.products_import);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Import Produk"
        description="Import dari Excel/CSV dengan preview, validasi, auto-create kategori/brand/unit/supplier, batch, dan expired date."
        actions={
          <Button asChild variant="outline" className="rounded-xl">
            <a href="/api/products/template" download="product-import-template.xlsx">
              Download Template
            </a>
          </Button>
        }
      />
      <Card className="rounded-3xl border-primary/15 bg-primary/5">
        <CardContent className="grid gap-2 p-4 text-sm">
          <div className="font-semibold">Format template terbaru</div>
          <div className="text-muted-foreground">
            Gunakan sheet <span className="font-medium text-foreground">products</span>. Kolom wajib: name, sku,
            category, brand, supplier, unit, purchasePrice, sellingPrice, stock, minimumStock. Sheet{" "}
            <span className="font-medium text-foreground">panduan</span> berisi keterangan format.
          </div>
        </CardContent>
      </Card>
      <ProductImportUploader />
    </div>
  );
}
