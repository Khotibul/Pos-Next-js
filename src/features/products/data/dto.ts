import type { ProductListItem, ProductDetail, FindProductByCodeResult } from "@/features/products/domain/entity";

type ProductRecord = {
  id: string;
  sku: string;
  name: string;
  barcode: string | null;
  category: { id: string; name: string } | null;
  costPrice: number | string;
  sellingPrice: number | string;
  wholesalePrice: number | string;
  wholesaleDiscountPercent: number | string;
  wholesaleMinQty: number | null;
  isActive: boolean;
  updatedAt: Date;
};

export function toProductListItem(
  record: ProductRecord,
  stock: number,
): ProductListItem {
  return {
    ...record,
    costPrice: Number(record.costPrice),
    sellingPrice: Number(record.sellingPrice),
    wholesalePrice: Number(record.wholesalePrice),
    wholesaleDiscountPercent: Number(record.wholesaleDiscountPercent),
    stock,
  };
}

export function toProductDetail(record: unknown): ProductDetail {
  return record as ProductDetail;
}

export function toFindProductByCodeResult(record: {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  qrCode: string | null;
  sellingPrice: number | string;
  wholesalePrice: number | string;
  wholesaleDiscountPercent: number | string;
  wholesaleMinQty: number | null;
}): FindProductByCodeResult {
  return {
    ...record,
    sellingPrice: Number(record.sellingPrice),
    wholesalePrice: Number(record.wholesalePrice),
    wholesaleDiscountPercent: Number(record.wholesaleDiscountPercent),
  };
}
