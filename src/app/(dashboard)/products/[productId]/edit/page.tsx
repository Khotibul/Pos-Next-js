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
        slug: product.slug,
        description: product.description,
        barcode: product.barcode,
        qrCode: product.qrCode,
        categoryId: product.categoryId,
        brandId: product.brandId,
        supplierId: product.supplierId,
        unitId: product.unitId,
        costPrice: product.costPrice.toString(),
        sellingPrice: product.sellingPrice.toString(),
        marginPct: product.marginPct?.toString?.() ?? undefined,
        taxRate: product.taxRate?.toString?.() ?? undefined,
        weight: product.weight?.toString?.() ?? undefined,
        volume: product.volume?.toString?.() ?? undefined,
        minStock: product.minStock?.toString?.() ?? undefined,
        reorderPoint: product.reorderPoint?.toString?.() ?? undefined,
        wholesalePrice: product.wholesalePrice?.toString() ?? "0",
        wholesaleDiscountPercent: product.wholesaleDiscountPercent?.toString() ?? "0",
        wholesaleMinQty: product.wholesaleMinQty?.toString() ?? "0",
        totalStock: product.totalStock,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        isConsignment: product.isConsignment,
        type: product.type,
      }}
      action={updateProductAction}
    />
  );
}
