import "server-only";
import crypto from "node:crypto";

import { prisma } from "@/shared/server/db/prisma";
import { Errors } from "@/shared/server/errors/app-error";
import { getCachedProducts, cacheReceiptData } from "@/lib/transaction-cache";
import {
  findAvailableStock,
  decrementStockRaw,
  createSaleInTransaction,
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
  canOverridePrice?: boolean;
  input: CreateSaleInput;
}): Promise<SaleResult> {
  const { tenantId, shiftId, branchId, cashierId, canOverridePrice, input } = params;
  if (!shiftId) throw Errors.badRequest("Shift belum dibuka.");

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await executeCreateSale(tenantId, shiftId, branchId, cashierId ?? null, input, canOverridePrice === true);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      const msg = err?.message ?? (e instanceof Error ? e.message : "");
      const isRetryable = (err?.code === "P2002" || msg.includes("Stok berubah") || msg.includes("Stok") && msg.includes("tidak mencukupi") === false) && attempt < 2;
      if (isRetryable) {
        // Backoff 50-150ms agar tidak thundering herd saat transaksi padat
        await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));
        continue;
      }
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
  canOverridePrice: boolean,
): Promise<SaleResult> {
  const endProducts = createDevTimer("pos.createSale.products");
  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const variantIds = [...new Set(input.items.map((i) => i.variantId).filter(Boolean) as string[])];
  const [productMap, variantRows] = await Promise.all([
    getCachedProducts(tenantId, productIds),
    variantIds.length
      ? prisma.productVariant.findMany({
          where: { tenantId, id: { in: variantIds }, isActive: true },
          select: { id: true, productId: true, name: true, sku: true, sellingPrice: true },
        })
      : Promise.resolve([]),
  ]);
  const variantMap = new Map(variantRows.map((v) => [v.id, v]));

  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product) throw Errors.badRequest("Produk tidak valid atau tidak aktif.");
    if (item.variantId) {
      const variant = variantMap.get(item.variantId);
      if (!variant || variant.productId !== product.id) {
        throw Errors.badRequest("Varian produk tidak valid atau tidak aktif.");
      }
    }
    if (item.priceOverride && !canOverridePrice) {
      throw Errors.badRequest("Anda tidak berwenang mengubah harga jual.");
    }
    if (item.priceOverride && (item.unitPrice === undefined || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) {
      throw Errors.badRequest("Harga jual manual tidak valid.");
    }
  }

  const lines = input.items.map((i) => {
    const p = productMap.get(i.productId)!;
    const variant = i.variantId ? variantMap.get(i.variantId) : undefined;
    let price = variant ? Number(variant.sellingPrice) : Number(p.sellingPrice);
    let isWholesale = false;
    const minQty = Number((p as unknown as { wholesaleMinQty: unknown }).wholesaleMinQty ?? 0);
    if (!variant && minQty > 0 && i.qty >= minQty) {
      const wp = Number((p as unknown as { wholesalePrice: unknown }).wholesalePrice ?? 0);
      const disc = Number((p as unknown as { wholesaleDiscountPercent: unknown }).wholesaleDiscountPercent ?? 0);
      if (wp > 0) {
        price = wp;
        isWholesale = true;
      } else if (disc > 0) {
        price = price * (1 - disc / 100);
        isWholesale = true;
      }
    } else if (variant && minQty > 0 && i.qty >= minQty) {
      const disc = Number((p as unknown as { wholesaleDiscountPercent: unknown }).wholesaleDiscountPercent ?? 0);
      if (disc > 0) {
        price = price * (1 - disc / 100);
        isWholesale = true;
      }
    }
    const isPriceOverridden = i.priceOverride === true;
    if (isPriceOverridden) price = i.unitPrice as number;
    const lineTotal = price * i.qty;
    return {
      productId: p.id,
      variantId: variant?.id ?? null,
      variantName: variant?.name ?? null,
      name: variant ? `${p.name} - ${variant.name}` : p.name,
      sku: variant?.sku || p.sku,
      price,
      qty: i.qty,
      lineTotal,
      isPriceOverridden,
      isWholesale,
    };
  });
  endProducts();

  const endCalc = createDevTimer("pos.createSale.calc");
  const subtotal = lines.reduce((acc, l) => acc + l.lineTotal, 0);
  const discount = input.discount ?? 0;
  const tax = Math.max(0, (subtotal - discount) * ((input.taxRate ?? 0) / 100));
  const total = Math.max(0, subtotal - discount + tax);
  const receivedAmount = input.payment.receivedAmount ?? input.payment.amount;
  const changeAmount = Math.max(0, input.payment.changeAmount ?? receivedAmount - total);
  const isCredit = input.payment.method === "CREDIT";

  if (!isCredit && (input.payment.amount < total || receivedAmount < total)) throw Errors.badRequest("Nominal pembayaran kurang.");
  if (isCredit && !input.customerId) throw Errors.badRequest("Transaksi hutang wajib memilih pelanggan.");
  endCalc();

  const stockKey = (productId: string, variantId?: string | null) => `${productId}:${variantId ?? ""}`;
  const requestedQtyByStock = new Map<string, { productId: string; variantId: string | null; qty: number; label: string }>();
  for (const line of lines) {
    const key = stockKey(line.productId, line.variantId);
    const current = requestedQtyByStock.get(key);
    requestedQtyByStock.set(key, {
      productId: line.productId,
      variantId: line.variantId,
      qty: (current?.qty ?? 0) + line.qty,
      label: line.variantName ? `${productMap.get(line.productId)?.name ?? "Produk"} - ${line.variantName}` : (productMap.get(line.productId)?.name ?? "Produk"),
    });
  }

  const endStockFetch = createDevTimer("pos.createSale.stockFetch");
  const allStockRows = await findAvailableStock(
    tenantId,
    Array.from(requestedQtyByStock.values()).map((i) => ({ productId: i.productId, variantId: i.variantId })),
    branchId,
  );
  endStockFetch();

  const stockByKey = new Map<string, Array<{ id: string; qty: number }>>();
  for (const row of allStockRows) {
    const key = stockKey(row.productId, row.variantId);
    const arr = stockByKey.get(key) ?? [];
    arr.push({ id: row.id, qty: Number(row.qty) });
    stockByKey.set(key, arr);
  }

  const decrements: Array<{ id: string; qty: number }> = [];
  for (const [key, requested] of requestedQtyByStock.entries()) {
    const stocks = stockByKey.get(key) ?? [];
    const availableQty = stocks.reduce((sum, s) => sum + Number(s.qty), 0);
    if (availableQty < requested.qty) {
      throw Errors.badRequest(`Stok ${requested.label} tidak mencukupi. Tersedia ${availableQty}, diminta ${requested.qty}.`);
    }
    let remainingQty = requested.qty;
    for (const stock of stocks) {
      if (remainingQty <= 0) break;
      const stockQty = Number(stock.qty);
      const decrementQty = Math.min(stockQty, remainingQty);
      decrements.push({ id: stock.id, qty: decrementQty });
      remainingQty -= decrementQty;
    }
  }

  const endTransaction = createDevTimer("pos.createSale.transaction");
  const created = await prisma.$transaction(async (tx) => {
    const invoiceNo = generateInvoiceNo("TRX");

    // Cek shift masih OPEN di dalam transaksi (tanpa update, jadi lock singkat)
    const shiftOk = await tx.cashierShift.findFirst({ where: { id: shiftId, status: "OPEN" }, select: { id: true } });
    if (!shiftOk) throw Errors.badRequest("Shift sudah ditutup. Tidak dapat memproses transaksi.");

    const updatedCount = await decrementStockRaw(tx, tenantId, decrements);
    if (updatedCount !== decrements.length) {
      throw Errors.badRequest("Stok berubah saat transaksi diproses. Silakan ulangi transaksi.");
    }

    const sale = await createSaleInTransaction(tx, {
      tenantId,
      invoiceNo,
      cashierId,
      shiftId,
      customerId: input.customerId,
      subtotal,
      discount,
      tax,
      total,
      status: isCredit ? "CREDIT" : "PAID",
      lines,
      payment: {
        method: input.payment.method,
        amount: isCredit ? 0 : total,
        receivedAmount: isCredit ? 0 : receivedAmount,
        changeAmount: isCredit ? 0 : changeAmount,
        reference: input.payment.reference || null,
      },
    });

    if (isCredit) {
      await tx.receivable.create({
        data: {
          tenantId,
          customerId: input.customerId!,
          saleId: sale.id,
          invoiceNo,
          description: `Hutang dari penjualan ${invoiceNo}`,
          totalAmount: total,
          paidAmount: 0,
          remainingAmount: total,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          status: "UNPAID",
        },
      });
    }

    const cashTotal = input.payment.method === "CASH" ? total : 0;
    const qrisTotal = input.payment.method === "QRIS" ? total : 0;
    const transferTotal = input.payment.method === "TRANSFER" ? total : 0;
    const ewalletTotal = input.payment.method === "EWALLET" ? total : 0;
    const cardTotal = input.payment.method === "CARD" ? total : 0;

    const updatedShift = await tx.cashierShift.updateMany({
      where: { id: shiftId, status: "OPEN" },
      data: {
        totalSales: { increment: total },
        transactionCount: { increment: 1 },
        cashSystem: { increment: cashTotal },
        totalCash: { increment: cashTotal },
        totalQris: { increment: qrisTotal },
        totalTransfer: { increment: transferTotal + cardTotal },
        totalEwallet: { increment: ewalletTotal },
      },
    });

    if (updatedShift.count !== 1) {
      throw Errors.badRequest("Shift sudah ditutup. Tidak dapat memproses transaksi.");
    }

    return sale;
  }, { timeout: 10000, maxWait: 5000 });
  endTransaction();

  const endReceiptCache = createDevTimer("pos.createSale.cacheReceipt");
  void cacheReceiptData(created.id, tenantId, {
    sale: {
      id: created.id,
      invoiceNo: created.invoiceNo,
      status: isCredit ? "CREDIT" : created.status,
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
          amount: isCredit ? 0 : total,
          receivedAmount: isCredit ? 0 : receivedAmount,
          changeAmount: isCredit ? 0 : changeAmount,
          reference: input.payment.reference || null,
        },
      ],
    },
    printer: {},
  });
  endReceiptCache();

  return { id: created.id, invoiceNo: created.invoiceNo, total: Number(created.total) };
}
