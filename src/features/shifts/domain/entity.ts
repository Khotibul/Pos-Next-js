import type { Prisma } from "@prisma/client";

export type ShiftWithRelations = Prisma.CashierShiftGetPayload<{
  include: {
    cashier: { select: { id: true; name: true; email: true } };
    branch: { select: { id: true; name: true; code: true } };
    approvedBy: { select: { id: true; name: true; email: true } };
  };
}>;

export type ShiftSummary = {
  totalSales: number;
  totalCash: number;
  totalQris: number;
  totalTransfer: number;
  totalEwallet: number;
  transactionCount: number;
  cashSystem: number;
};

export type ShiftDetailResult = {
  shift: ShiftWithRelations;
  summary: ShiftSummary;
  sales: Array<{ id: string; invoiceNo: string; status: string; total: number; createdAt: Date }>;
};
