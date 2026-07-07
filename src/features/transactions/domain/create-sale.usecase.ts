import "server-only";
import crypto from "node:crypto";

import { prisma } from "@/shared/server/db/prisma";
import { Errors } from "@/shared/server/errors/app-error";
import { getCachedProducts, cacheReceiptData } from "@/lib/transaction-cache";
import {
  findAvailableStock,
  decrementStockRaw,
  createSaleInTransaction,
  updateShiftTotals,
} from "@/features/transactions/data/repository";
import type { CreateSaleInput, SaleResult } from "@/features/transactions/domain/entity";
import { createDevTimer } from "@/shared/utils/perf";

function generateInvoiceNo(prefix = "TRX") {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `${prefix}-${y}${m}${day}-${rand}`;
}

export async function createSaleUseCase(params: {
  tenantId: string;
  shiftId: string;
  branchId: string;
  cashierId?: string | null;
  input: CreateSaleInput;
}): Promise<SaleResult> {
  const { tenantId, shiftId, branchId, cashierId, input } = params;
  if (!shiftId) throw Errors.badRequest("Shift belum dibuka.");

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await executeCreateSale(tenantId, shiftId, branchId, cashierId ?? null, input);
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err?.code === "P2002" && attempt < 2) continue;
      throw e;
    }
  }
  throw Errors.badRequest("Gagal membuat transaksi. Silakan coba lagi.");
}

async function executeCreateSale(
  tenantId: string,
  shiftId: string,
  branchId: string,
  cashierId: string | null,
  input: CreateSaleInput,
): Promise<SaleResult> {
  const endProducts = createDevTimer("pos.createSale.products");
  const productIds = input.items.map((i) => i.productId);
  const productMap = await getCachedProducts(tenantId, productIds);

  for (const item of input.items) {
    if (!productMap.has(item.productId)) throw Errors.badRequest("Produk tidak valid atau tidak aktif.");
  }

  const lines = input.items.map((i) => {
    const p = productMap.get(i.productId)!;
    const price = Number(p.sellingPrice);
    const lineTotal = price * i.qty;
    return { productId: p.id, name: p.name, sku: p.sku, price, qty: i.qty, lineTotal };
  });
  endProducts();

  const endCalc = createDevTimer("pos.createSale.calc");
  const subtotal = lines.reduce((acc, l) => acc + l.lineTotal, 0);
  const discount = input.discount ?? 0;
  const tax = Math.max(0, (subtotal - discount) * ((input.taxRate ?? 0) / 100));
  const total = Math.max(0, subtotal - discount + tax);
  const receivedAmount = input.payment.receivedAmount ?? input.payment.amount;
  const changeAmount = Math.max(0, input.payment.changeAmount ?? receivedAmount - total);

  if (input.payment.amount < total || receivedAmount < total) throw Errors.badRequest("Nominal pembayaran kurang.");
  endCalc();

  const endTransaction = createDevTimer("pos.createSale.transaction");
  const created = await prisma.$transaction(async (tx) => {
    const invoiceNo = generateInvoiceNo("TRX");

    const requestedQtyByProduct = new Map<string, number>();
    for (const line of lines) {
      requestedQtyByProduct.set(line.productId, (requestedQtyByProduct.get(line.productId) ?? 0) + line.qty);
    }

    const allStockRows = await findAvailableStock(tenantId, Array.from(requestedQtyByProduct.keys()), branchId);

    const stockByProduct = new Map<string, Array<{ id: string; qty: number }>>();
    for (const row of allStockRows) {
      const arr = stockByProduct.get(row.productId) ?? [];
      arr.push({ id: row.id, qty: Number(row.qty) });
      stockByProduct.set(row.productId, arr);
    }

    const decrements: Array<{ id: string; qty: number }> = [];
    for (const [productId, requestedQty] of requestedQtyByProduct.entries()) {
      const stocks = stockByProduct.get(productId) ?? [];
      const availableQty = stocks.reduce((sum, s) => sum + Number(s.qty), 0);
      if (availableQty < requestedQty) {
        const productName = productMap.get(productId)?.name ?? "Produk";
        throw Errors.badRequest(`Stok ${productName} tidak mencukupi. Tersedia ${availableQty}, diminta ${requestedQty}.`);
      }

      let remainingQty = requestedQty;
      for (const stock of stocks) {
        if (remainingQty <= 0) break;
        const stockQty = Number(stock.qty);
        const decrementQty = Math.min(stockQty, remainingQty);
        decrements.push({ id: stock.id, qty: decrementQty });
        remainingQty -= decrementQty;
      }
    }

    const updatedCount = await decrementStockRaw(tenantId, decrements);
    if (updatedCount !== decrements.length) {
      throw Errors.badRequest("Stok berubah saat transaksi diproses. Silakan ulangi transaksi.");
    }

    const sale = await createSaleInTransaction(tx, {
      tenantId,
      invoiceNo,
      cashierId,
      shiftId,
      subtotal,
      discount,
      tax,
      total,
      lines,
      payment: {
        method: input.payment.method,
        amount: total,
        receivedAmount,
        changeAmount,
        reference: input.payment.reference || null,
      },
    });

    const cashTotal = input.payment.method === "CASH" ? total : 0;
    const qrisTotal = input.payment.method === "QRIS" ? total : 0;
    const transferTotal = input.payment.method === "TRANSFER" ? total : 0;
    const ewalletTotal = input.payment.method === "EWALLET" ? total : 0;

    const updatedShift = await updateShiftTotals(tx, shiftId, {
      total,
      cashTotal,
      qrisTotal,
      transferTotal,
      ewalletTotal,
    });

    if (updatedShift.count !== 1) {
      throw Errors.badRequest("Shift sudah ditutup. Tidak dapat memproses transaksi.");
    }

    return sale;
  });
  endTransaction();

  const endReceiptCache = createDevTimer("pos.createSale.cacheReceipt");
  void cacheReceiptData(created.id, tenantId, {
    sale: {
      id: created.id,
      invoiceNo: created.invoiceNo,
      status: created.status,
      createdAt: created.createdAt.toISOString(),
      subtotal: Number(created.subtotal),
      discount: Number(created.discount),
      tax: Number(created.tax),
      total: Number(created.total),
      items: lines.map((l, idx) => ({
        id: `${created.id}-item-${idx}`,
        name: l.name,
        sku: l.sku,
        price: l.price,
        qty: l.qty,
        lineTotal: l.lineTotal,
      })),
      payments: [
        {
          id: `${created.id}-payment-0`,
          method: input.payment.method,
          amount: total,
          receivedAmount,
          changeAmount,
          reference: input.payment.reference || null,
        },
      ],
    },
    printer: {},
  });
  endReceiptCache();

  return { id: created.id, invoiceNo: created.invoiceNo, total: Number(created.total) };
}
