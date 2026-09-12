export type ReceivableListItem = {
  id: string;
  invoiceNo: string;
  description: string | null;
  customerId: string | null;
  customerName: string | null;
  saleId: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: Date | null;
  status: "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE";
  notes: string | null;
  createdAt: Date;
};

export type ReceivableDetail = ReceivableListItem & {
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

export type ReceivableOverview = {
  total: number;
  unpaid: number;
  partial: number;
  paid: number;
  overdue: number;
  totalReceivable: number;
  totalPaid: number;
  totalRemaining: number;
};
