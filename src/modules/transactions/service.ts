import "server-only";

import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import type { CreateSaleInput } from "@/modules/transactions/validators";

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
    include: { items: true, payments: true },
  });
  if (!sale) throw Errors.notFound("Transaksi tidak ditemukan.");
  return sale;
}

export async function createSale(params: { tenantId: string; cashierId?: string | null; input: CreateSaleInput }) {
  const productIds = params.input.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { tenantId: params.tenantId, id: { in: productIds }, isActive: true },
    select: { id: true, name: true, sku: true, sellingPrice: true },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));
  for (const item of params.input.items) {
    if (!productMap.has(item.productId)) throw Errors.badRequest("Produk tidak valid atau tidak aktif.");
  }

  const lines = params.input.items.map((i) => {
    const p = productMap.get(i.productId)!;
    const price = Number(p.sellingPrice);
    const lineTotal = price * i.qty;
    return { productId: p.id, name: p.name, sku: p.sku, price, qty: i.qty, lineTotal };
  });

  const subtotal = lines.reduce((acc, l) => acc + l.lineTotal, 0);
  const discount = params.input.discount ?? 0;
  const tax = Math.max(0, (subtotal - discount) * ((params.input.taxRate ?? 0) / 100));
  const total = Math.max(0, subtotal - discount + tax);

  if (params.input.payment.amount < total) throw Errors.badRequest("Nominal pembayaran kurang.");

  const invoiceNo = inv("TRX");

  const created = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        tenantId: params.tenantId,
        invoiceNo,
        cashierId: params.cashierId ?? null,
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
            amount: params.input.payment.amount,
            reference: params.input.payment.reference || null,
          },
        },
      },
      select: { id: true, invoiceNo: true, total: true },
    });
    return sale;
  });

  return created;
}

export async function deleteSale(params: { tenantId: string; id: string }) {
  const exists = await prisma.sale.findFirst({ where: { tenantId: params.tenantId, id: params.id }, select: { id: true } });
  if (!exists) throw Errors.notFound("Transaksi tidak ditemukan.");
  await prisma.sale.delete({ where: { id: params.id } });
}
