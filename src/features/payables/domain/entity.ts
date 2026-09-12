export type PayableListItem = {
  id: string;
  invoiceNo: string;
  description: string | null;
  supplierId: string | null;
  supplierName: string | null;
  purchaseOrderId: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: Date | null;
  status: "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE";
  notes: string | null;
  createdAt: Date;
};

export type PayableDetail = PayableListItem & {
  payments: {
    id: string;
    amount: number;
    method: string;
    reference: string | null;
    notes: string | null;
    paidAt: Date;
    createdAt: Date;
  }[];
};

export type PayableOverview = {
  total: number;
  unpaid: number;
  partial: number;
  paid: number;
  overdue: number;
  totalPayable: number;
  totalPaid: number;
  totalRemaining: number;
};
