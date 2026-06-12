import "server-only";

import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import type { CreateSaleInput } from "@/modules/transactions/validators";
import { getCachedProducts, cacheReceiptData } from "@/lib/transaction-cache";
import { createDevTimer } from "@/lib/perf";
import { startTimer } from "@/lib/perf-monitor";

function inv(prefix = "TRX") {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${y}${m}${day}-${rand}`;
}

export async function listSales(params: {
  tenantId: string;
  q?: string | null;
  status?: "PAID" | "VOID" | string | null;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 20));
  const q = params.q?.trim() || null;
  const status = params.status && (params.status === "PAID" || params.status === "VOID") ? params.status : null;

  const where = {
    tenantId: params.tenantId,
    ...(q ? { invoiceNo: { contains: q } } : {}),
    ...(status ? { status } : {}),
  };

  const [total, items] = await prisma.$transaction([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        invoiceNo: true,
        total: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  return { items, total, page, pageSize, q, status };
}

export async function getSaleById(params: { tenantId: string; id: string }) {
  const sale = await prisma.sale.findFirst({
    where: { tenantId: params.tenantId, id: params.id },
    select: {
      id: true,
      invoiceNo: true,
      cashierId: true,
      shiftId: true,
      subtotal: true,
      tax: true,
      discount: true,
      total: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      items: {
        select: { id: true, productId: true, name: true, sku: true, price: true, qty: true, lineTotal: true },
      },
      payments: {
        select: { id: true, method: true, amount: true, receivedAmount: true, changeAmount: true, reference: true, createdAt: true },
      },
    },
  });
  if (!sale) throw Errors.notFound("Transaksi tidak ditemukan.");
  return sale;
}

export async function createSale(params: { tenantId: string; shiftId: string; cashierId?: string | null; input: CreateSaleInput }) {
  const transTimer = startTimer();
  const endValidate = createDevTimer("pos.createSale.validate");
  if (!params.shiftId) throw Errors.badRequest("Shift belum dibuka.");
  if (params.cashierId) {
    const ok = await prisma.cashierShift.findFirst({
      where: { tenantId: params.tenantId, id: params.shiftId, status: "OPEN", cashierId: params.cashierId },
      select: { id: true },
    });
    if (!ok) throw Errors.badRequest("Shift belum dibuka atau sudah ditutup.");
  }
  endValidate();

  const endProducts = createDevTimer("pos.createSale.products");
  const productIds = params.input.items.map((i) => i.productId);
  const productMap = await getCachedProducts(params.tenantId, productIds);

  for (const item of params.input.items) {
    if (!productMap.has(item.productId)) throw Errors.badRequest("Produk tidak valid atau tidak aktif.");
  }

  const lines = params.input.items.map((i) => {
    const p = productMap.get(i.productId)!;
    const price = Number(p.sellingPrice);
    const lineTotal = price * i.qty;
    return { productId: p.id, name: p.name, sku: p.sku, price, qty: i.qty, lineTotal };
  });
  endProducts();

  const endCalc = createDevTimer("pos.createSale.calc");
  const subtotal = lines.reduce((acc, l) => acc + l.lineTotal, 0);
  const discount = params.input.discount ?? 0;
  const tax = Math.max(0, (subtotal - discount) * ((params.input.taxRate ?? 0) / 100));
  const total = Math.max(0, subtotal - discount + tax);
  const receivedAmount = params.input.payment.receivedAmount ?? params.input.payment.amount;
  const changeAmount = Math.max(0, params.input.payment.changeAmount ?? receivedAmount - total);

  if (params.input.payment.amount < total || receivedAmount < total) throw Errors.badRequest("Nominal pembayaran kurang.");
  endCalc();

  const invoiceNo = inv("TRX");

  const endTransaction = createDevTimer("pos.createSale.transaction");
  const created = await prisma.$transaction(async (tx) => {
    const shift = await tx.cashierShift.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.shiftId,
        status: "OPEN",
        ...(params.cashierId ? { cashierId: params.cashierId } : {}),
      },
      select: { id: true, branchId: true },
    });
    if (!shift) throw Errors.badRequest("Shift belum dibuka atau sudah ditutup.");

    const requestedQtyByProduct = new Map<string, number>();
    for (const line of lines) {
      requestedQtyByProduct.set(line.productId, (requestedQtyByProduct.get(line.productId) ?? 0) + line.qty);
    }

    for (const [productId, requestedQty] of requestedQtyByProduct.entries()) {
      const stocks = await tx.productWarehouseStock.findMany({
        where: {
          tenantId: params.tenantId,
          productId,
          warehouse: { tenantId: params.tenantId, branchId: shift.branchId, isActive: true },
          qty: { gt: 0 },
        },
        orderBy: { updatedAt: "asc" },
        select: { id: true, qty: true },
      });

      const availableQty = stocks.reduce((sum, stock) => sum + Number(stock.qty), 0);
      if (availableQty < requestedQty) {
        const productName = productMap.get(productId)?.name ?? "Produk";
        throw Errors.badRequest(`Stok ${productName} tidak mencukupi. Tersedia ${availableQty}, diminta ${requestedQty}.`);
      }

      let remainingQty = requestedQty;
      for (const stock of stocks) {
        if (remainingQty <= 0) break;
        const stockQty = Number(stock.qty);
        const decrementQty = Math.min(stockQty, remainingQty);
        const updated = await tx.productWarehouseStock.updateMany({
          where: { id: stock.id, tenantId: params.tenantId, qty: { gte: decrementQty } },
          data: { qty: { decrement: decrementQty } },
        });
        if (updated.count !== 1) {
          throw Errors.badRequest("Stok berubah saat transaksi diproses. Silakan ulangi transaksi.");
        }
        remainingQty -= decrementQty;
      }
    }

    const sale = await tx.sale.create({
      data: {
        tenantId: params.tenantId,
        invoiceNo,
        cashierId: params.cashierId ?? null,
        shiftId: params.shiftId,
        subtotal,
        discount,
        tax,
        total,
        status: "PAID",
        items: {
          create: lines.map((l) => ({
            tenantId: params.tenantId,
            productId: l.productId,
            name: l.name,
            sku: l.sku,
            price: l.price,
            qty: l.qty,
            lineTotal: l.lineTotal,
          })),
        },
        payments: {
          create: {
            tenantId: params.tenantId,
            method: params.input.payment.method,
            amount: total,
            receivedAmount,
            changeAmount,
            reference: params.input.payment.reference || null,
          },
        },
      },
      select: { id: true, invoiceNo: true, total: true, createdAt: true, discount: true, tax: true, subtotal: true, status: true },
    });

    const totalCash = params.input.payment.method === "CASH" ? total : 0;
    const totalQris = params.input.payment.method === "QRIS" ? total : 0;
    const totalTransfer = params.input.payment.method === "TRANSFER" ? total : 0;
    const totalEwallet = params.input.payment.method === "EWALLET" ? total : 0;

    await tx.cashierShift.update({
      where: { id: params.shiftId },
      data: {
        totalSales: { increment: total },
        transactionCount: { increment: 1 },
        cashSystem: { increment: totalCash },
        totalCash: { increment: totalCash },
        totalQris: { increment: totalQris },
        totalTransfer: { increment: totalTransfer },
        totalEwallet: { increment: totalEwallet },
      },
      select: { id: true },
    });

    return sale;
  });
  endTransaction();

  const endReceiptCache = createDevTimer("pos.createSale.cacheReceipt");
  void cacheReceiptData(created.id, params.tenantId, {
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
          method: params.input.payment.method,
          amount: total,
          receivedAmount,
          changeAmount,
          reference: params.input.payment.reference || null,
        },
      ],
    },
    printer: {},
  });
  endReceiptCache();

  transTimer("transaction");

  return { id: created.id, invoiceNo: created.invoiceNo, total: Number(created.total) };
}

export async function deleteSale(params: { tenantId: string; id: string }) {
  const exists = await prisma.sale.findFirst({ where: { tenantId: params.tenantId, id: params.id }, select: { id: true } });
  if (!exists) throw Errors.notFound("Transaksi tidak ditemukan.");
  await prisma.sale.delete({ where: { id: params.id } });
}
