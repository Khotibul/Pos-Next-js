import type { SaleListItem, SaleDetail } from "@/features/transactions/domain/entity";
import type { Prisma } from "@prisma/client";

type SaleRecord = Prisma.SaleGetPayload<{
  select: {
    id: true;
    invoiceNo: true;
    total: true;
    status: true;
    createdAt: true;
  };
}>;

type SaleDetailRecord = Prisma.SaleGetPayload<{
  select: {
    id: true;
    invoiceNo: true;
    cashierId: true;
    shiftId: true;
    subtotal: true;
    tax: true;
    discount: true;
    total: true;
    status: true;
    createdAt: true;
    updatedAt: true;
    items: { select: { id: true; productId: true; name: true; sku: true; price: true; qty: true; lineTotal: true } };
    payments: { select: { id: true; method: true; amount: true; receivedAmount: true; changeAmount: true; reference: true; createdAt: true } };
  };
}>;

export function toSaleListItem(record: SaleRecord): SaleListItem {
  return {
    id: record.id,
    invoiceNo: record.invoiceNo,
    total: Number(record.total),
    status: record.status,
    createdAt: record.createdAt,
  };
}

export function toSaleDetail(record: SaleDetailRecord): SaleDetail {
  return {
    id: record.id,
    invoiceNo: record.invoiceNo,
    cashierId: record.cashierId,
    shiftId: record.shiftId,
    subtotal: Number(record.subtotal),
    tax: Number(record.tax),
    discount: Number(record.discount),
    total: Number(record.total),
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    items: record.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      name: i.name,
      sku: i.sku,
      price: Number(i.price),
      qty: i.qty,
      lineTotal: Number(i.lineTotal),
    })),
    payments: record.payments.map((p) => ({
      id: p.id,
      method: p.method,
      amount: Number(p.amount),
      receivedAmount: Number(p.receivedAmount),
      changeAmount: Number(p.changeAmount),
      reference: p.reference,
      createdAt: p.createdAt,
    })),
  };
}
