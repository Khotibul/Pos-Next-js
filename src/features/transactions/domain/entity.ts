export type PaymentMethod = "CASH" | "QRIS" | "TRANSFER" | "EWALLET" | "CARD";

export type CartItem = {
  productId: string;
  qty: number;
};

export type CartLine = {
  productId: string;
  name: string;
  sku: string;
  price: number;
  qty: number;
  lineTotal: number;
  isWholesale?: boolean;
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
    name: string;
    sku: string;
    price: number;
    qty: number;
    lineTotal: number;
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
