import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { getProductById, listProductMeta } from "@/modules/products/service";
import { ProductForm } from "@/modules/products/components/product-form";
import { updateProductAction } from "@/modules/products/actions";

export default async function EditProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const ctx = await requirePermission(PERMISSIONS.products_write);
  const { productId } = await params;

  const [product, meta] = await Promise.all([
    getProductById({ tenantId: ctx.tenantId, id: productId }),
    listProductMeta({ tenantId: ctx.tenantId }),
  ]);

  return (
    <ProductForm
      title="Edit Produk"
      meta={meta}
      initial={{
        id: product.id,
        sku: product.sku,
        name: product.name,
        barcode: product.barcode,
        qrCode: product.qrCode,
        categoryId: product.categoryId,
        brandId: product.brandId,
        unitId: product.unitId,
        costPrice: product.costPrice.toString(),
        sellingPrice: product.sellingPrice.toString(),
        isActive: product.isActive,
      }}
      action={updateProductAction}
    />
  );
}
