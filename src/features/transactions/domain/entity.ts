export type PaymentMethod = "CASH" | "QRIS" | "TRANSFER" | "EWALLET" | "CARD" | "CREDIT";

export type CartItem = {
  productId: string;
  variantId?: string;
  qty: number;
  priceOverride?: boolean;
  unitPrice?: number;
};

export type CartLine = {
  productId: string;
  variantId?: string;
  variantName?: string;
  name: string;
  sku: string;
  price: number;
  qty: number;
  lineTotal: number;
  isWholesale?: boolean;
  isPriceOverridden?: boolean;
};

export type ProductVariant = {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  qrCode?: string | null;
  price: number;
  stock?: number;
  isActive?: boolean;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  barcode?: string | null;
  qrCode?: string | null;
  stock?: number;
  wholesalePrice?: number;
  wholesaleDiscountPercent?: number;
  wholesaleMinQty?: number;
  variants?: ProductVariant[];
};

export type PaymentInput = {
  method: PaymentMethod;
  amount: number;
  receivedAmount?: number;
  changeAmount?: number;
  reference?: string;
};

export type CreateSaleInput = {
  items: CartItem[];
  discount: number;
  taxRate: number;
  payment: PaymentInput;
  customerId?: string;
  dueDate?: string;
};

export type SaleResult = {
  id: string;
  invoiceNo: string;
  total: number;
};

export type SaleListItem = {
  id: string;
  invoiceNo: string;
  total: number;
  status: string;
  createdAt: Date;
};

export type SaleDetail = {
  id: string;
  invoiceNo: string;
  cashierId: string | null;
  shiftId: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    productId: string;
    variantId?: string | null;
    variantName?: string | null;
    name: string;
    sku: string;
    price: number;
    qty: number;
    lineTotal: number;
    priceOverridden?: boolean;
  }>;
  payments: Array<{
    id: string;
    method: string;
    amount: number;
    receivedAmount: number;
    changeAmount: number;
    reference: string | null;
    createdAt: Date;
  }>;
};

export type SaleListQuery = {
  tenantId: string;
  q?: string | null;
  status?: string | null;
  page?: number;
  pageSize?: number;
};

export type SaleListResult = {
  items: SaleListItem[];
  total: number;
  page: number;
  pageSize: number;
  q: string | null;
  status: string | null;
};
