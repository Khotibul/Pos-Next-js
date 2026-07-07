import type { Prisma } from "@prisma/client";

export type ProductListItem = {
  id: string;
  sku: string;
  name: string;
  barcode: string | null;
  category: { id: string; name: string } | null;
  costPrice: number;
  sellingPrice: number;
  wholesalePrice: number;
  wholesaleDiscountPercent: number;
  wholesaleMinQty: number | null;
  isActive: boolean;
  updatedAt: Date;
  stock: number;
};

export type ProductOverview = {
  total: number;
  active: number;
  inactive: number;
  withBarcode: number;
};

export type ProductDetail = Prisma.ProductGetPayload<{ include: { category: true; brand: true; supplier: true; unit: true } }> & {
  totalStock: number;
};

export type ProductMeta = {
  categories: Array<{ id: string; name: string }>;
  brands: Array<{ id: string; name: string }>;
  units: Array<{ id: string; name: string }>;
  suppliers: Array<{ id: string; name: string }>;
};

export type FindProductByCodeResult = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  qrCode: string | null;
  sellingPrice: number;
  wholesalePrice: number;
  wholesaleDiscountPercent: number;
  wholesaleMinQty: number | null;
};
