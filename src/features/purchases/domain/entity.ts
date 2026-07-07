export type PurchaseOrderListItem = {
  id: string;
  orderNo: string | null;
  status: string;
  supplier: { id: string; name: string } | null;
  totalItems: number;
  createdAt: Date;
};
