import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { listProductMeta } from "@/modules/products/service";
import { ProductForm } from "@/modules/products/components/product-form";
import { createProductAction } from "@/modules/products/actions";

export default async function CreateProductPage() {
  const ctx = await requirePermission(PERMISSIONS.products_write);
  const meta = await listProductMeta({ tenantId: ctx.tenantId });
  return <ProductForm title="Tambah Produk" meta={meta} action={createProductAction} />;
}

