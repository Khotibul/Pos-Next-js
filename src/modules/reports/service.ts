import "server-only";

import { prisma } from "@/lib/prisma";

export type ReportPreset = "today" | "7d" | "month" | "custom";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfMonth(d: Date) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addMs(d: Date, ms: number) {
  return new Date(d.getTime() + ms);
}

function numberOrZero(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function resolvePresetRange(preset: ReportPreset, custom?: { from?: Date | null; to?: Date | null }) {
  const now = new Date();
  if (preset === "today") {
    return { from: startOfDay(now), to: endOfDay(now), label: "Hari Ini" };
  }
  if (preset === "month") {
    return { from: startOfMonth(now), to: endOfDay(now), label: "Bulan Ini" };
  }
  if (preset === "custom") {
    const from = custom?.from ? startOfDay(custom.from) : startOfDay(now);
    const to = custom?.to ? endOfDay(custom.to) : endOfDay(now);
    return { from, to, label: "Kustom" };
  }
  // "7d"
  const from = startOfDay(addMs(now, -6 * 24 * 60 * 60 * 1000));
  const to = endOfDay(now);
  return { from, to, label: "7 Hari Terakhir" };
}

export function previousRange(from: Date, to: Date) {
  const durationMs = to.getTime() - from.getTime();
  const prevTo = addMs(from, -1);
  const prevFrom = addMs(prevTo, -durationMs);
  return { from: prevFrom, to: prevTo };
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

export async function getSalesKpis(params: { tenantId: string; from: Date; to: Date }) {
  const prev = previousRange(params.from, params.to);

  const [currSales, prevSales, currItems, prevItems] = await prisma.$transaction([
    prisma.sale.aggregate({
      where: { tenantId: params.tenantId, createdAt: { gte: params.from, lte: params.to } },
      _sum: { total: true },
      _count: { id: true },
      _avg: { total: true },
    }),
    prisma.sale.aggregate({
      where: { tenantId: params.tenantId, createdAt: { gte: prev.from, lte: prev.to } },
      _sum: { total: true },
      _count: { id: true },
      _avg: { total: true },
    }),
    prisma.saleItem.aggregate({
      where: { tenantId: params.tenantId, sale: { createdAt: { gte: params.from, lte: params.to } } },
      _sum: { qty: true },
    }),
    prisma.saleItem.aggregate({
      where: { tenantId: params.tenantId, sale: { createdAt: { gte: prev.from, lte: prev.to } } },
      _sum: { qty: true },
    }),
  ]);

  const totalSales = numberOrZero(currSales._sum.total);
  const totalTransactions = currSales._count.id ?? 0;
  const avgReceipt = numberOrZero(currSales._avg.total);
  const itemsSold = currItems._sum.qty ?? 0;

  const prevTotalSales = numberOrZero(prevSales._sum.total);
  const prevTotalTransactions = prevSales._count.id ?? 0;
  const prevAvgReceipt = numberOrZero(prevSales._avg.total);
  const prevItemsSold = prevItems._sum.qty ?? 0;

  return {
    totalSales,
    totalTransactions,
    avgReceipt,
    itemsSold,
    delta: {
      totalSales: pctChange(totalSales, prevTotalSales),
      totalTransactions: pctChange(totalTransactions, prevTotalTransactions),
      avgReceipt: pctChange(avgReceipt, prevAvgReceipt),
      itemsSold: pctChange(itemsSold, prevItemsSold),
    },
  };
}

export async function getSalesSeries(params: { tenantId: string; from: Date; to: Date }) {
  // Production note: for large datasets, prefer DB-level aggregation.
  const sales = await prisma.sale.findMany({
    where: { tenantId: params.tenantId, createdAt: { gte: params.from, lte: params.to } },
    select: { createdAt: true, total: true },
    orderBy: { createdAt: "asc" },
    take: 5000,
  });

  const byDay = new Map<string, number>();
  for (const s of sales) {
    const d = new Date(s.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    byDay.set(key, (byDay.get(key) ?? 0) + numberOrZero(s.total));
  }

  const labels = Array.from(byDay.keys()).sort();
  return labels.map((k) => ({ date: k, value: byDay.get(k) ?? 0 }));
}

export async function listSalesForReport(params: {
  tenantId: string;
  from: Date;
  to: Date;
  q?: string | null;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10));
  const q = params.q?.trim() || null;
  const where = {
    tenantId: params.tenantId,
    createdAt: { gte: params.from, lte: params.to },
    ...(q ? { invoiceNo: { contains: q } } : {}),
  };

  const [total, items] = await prisma.$transaction([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, invoiceNo: true, createdAt: true, total: true, status: true },
    }),
  ]);

  return { total, items, page, pageSize, q };
}

export async function getTopProducts(params: { tenantId: string; from: Date; to: Date; take?: number }) {
  const take = Math.min(10, Math.max(1, params.take ?? 5));
  const rows = await prisma.saleItem.groupBy({
    by: ["productId", "name"],
    where: { tenantId: params.tenantId, sale: { createdAt: { gte: params.from, lte: params.to } } },
    _sum: { qty: true, lineTotal: true },
    orderBy: { _sum: { lineTotal: "desc" } },
    take,
  });

  return rows.map((r) => ({
    productId: r.productId,
    name: r.name,
    qty: r._sum.qty ?? 0,
    revenue: numberOrZero(r._sum.lineTotal),
  }));
}
