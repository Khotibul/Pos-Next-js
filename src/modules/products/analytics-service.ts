import "server-only";

import { prisma } from "@/lib/prisma";

function numberOrZero(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type ProductAnalytics = {
  overview: {
    totalProducts: number;
    activeProducts: number;
    outOfStock: number;
    lowStock: number;
    expiredBatches: number;
    expiring7d: number;
    expiring30d: number;
    expiring90d: number;
    inventoryValuation: number;
  };
  charts: {
    salesTrend7d: Array<{ label: string; value: number }>;
    topCategories: Array<{ label: string; value: number }>;
    topBrands: Array<{ label: string; value: number }>;
  };
  top: {
    revenueProducts: Array<{ productId: string; name: string; revenue: number; qty: number }>;
    marginProducts: Array<{ productId: string; name: string; margin: number; qty: number }>;
  };
  ai: {
    slowMoving: Array<{ productId: string; name: string; stock: number; sold30d: number }>;
    reorderSuggestions: Array<{ productId: string; name: string; stock: number; avgDailySold: number; suggestedQty: number }>;
    promoSuggestions: Array<{ productId: string; name: string; stock: number; sold30d: number; suggestion: string }>;
  };
};

export async function getProductAnalytics(params: { tenantId: string; branchId: string }) : Promise<ProductAnalytics> {
  const now = new Date();
  const from30 = new Date(now);
  from30.setDate(from30.getDate() - 30);
  const from7 = new Date(now);
  from7.setDate(from7.getDate() - 7);

  const warehouses = await prisma.warehouse.findMany({
    where: { tenantId: params.tenantId, isActive: true, OR: [{ branchId: params.branchId }, { branchId: null }] },
    select: { id: true },
    take: 500,
  });
  const warehouseIds = warehouses.map((w) => w.id);

  const [totalProducts, activeProducts, stockRows, productsForValuation] = await Promise.all([
    prisma.product.count({ where: { tenantId: params.tenantId } }),
    prisma.product.count({ where: { tenantId: params.tenantId, isActive: true } }),
    prisma.productWarehouseStock.groupBy({
      by: ["productId"],
      where: { tenantId: params.tenantId, warehouseId: { in: warehouseIds } },
      _sum: { qty: true },
    }),
    prisma.product.findMany({
      where: { tenantId: params.tenantId, isActive: true },
      select: { id: true, name: true, costPrice: true, minStock: true },
      take: 5000,
    }),
  ]);

  const stockMap = new Map<string, number>(stockRows.map((r) => [r.productId, numberOrZero(r._sum.qty)]));
  let outOfStock = 0;
  let lowStock = 0;
  let inventoryValuation = 0;
  for (const p of productsForValuation) {
    const stock = stockMap.get(p.id) ?? 0;
    if (stock <= 0) outOfStock += 1;
    const minStock = numberOrZero(p.minStock);
    if (stock > 0 && minStock > 0 && stock <= minStock) lowStock += 1;
    inventoryValuation += stock * numberOrZero(p.costPrice);
  }

  const exp7 = new Date(now);
  exp7.setDate(exp7.getDate() + 7);
  const exp30 = new Date(now);
  exp30.setDate(exp30.getDate() + 30);
  const exp90 = new Date(now);
  exp90.setDate(exp90.getDate() + 90);

  const [expiredBatches, expiring7d, expiring30d, expiring90d] = await Promise.all([
    prisma.productBatch.count({ where: { tenantId: params.tenantId, branchId: params.branchId, expiredDate: { lt: now } } }),
    prisma.productBatch.count({ where: { tenantId: params.tenantId, branchId: params.branchId, expiredDate: { gte: now, lte: exp7 } } }),
    prisma.productBatch.count({ where: { tenantId: params.tenantId, branchId: params.branchId, expiredDate: { gte: now, lte: exp30 } } }),
    prisma.productBatch.count({ where: { tenantId: params.tenantId, branchId: params.branchId, expiredDate: { gte: now, lte: exp90 } } }),
  ]);

  // Sales trend (7 days)
  const sales = await prisma.sale.findMany({
    where: { tenantId: params.tenantId, createdAt: { gte: from7, lte: now } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true, total: true },
    take: 5000,
  });
  const byDay = new Map<string, number>();
  for (const s of sales) {
    const key = dayKey(new Date(s.createdAt));
    byDay.set(key, (byDay.get(key) ?? 0) + numberOrZero(s.total));
  }
  const days: Array<{ label: string; value: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    days.push({ label: key.slice(5), value: byDay.get(key) ?? 0 });
  }

  // Top products by revenue (30 days)
  const topRevenueRows = await prisma.saleItem.groupBy({
    by: ["productId", "name"],
    where: { tenantId: params.tenantId, sale: { createdAt: { gte: from30, lte: now } } },
    _sum: { qty: true, lineTotal: true },
    orderBy: { _sum: { lineTotal: "desc" } },
    take: 10,
  });
  const revenueProducts = topRevenueRows.map((r) => ({
    productId: r.productId,
    name: r.name,
    qty: r._sum.qty ?? 0,
    revenue: numberOrZero(r._sum.lineTotal),
  }));

  // Margin products: approximate using current costPrice and sold qty
  const productIds = Array.from(new Set(topRevenueRows.map((r) => r.productId)));
  const productCost = await prisma.product.findMany({
    where: { tenantId: params.tenantId, id: { in: productIds } },
    select: { id: true, costPrice: true },
  });
  const costMap = new Map(productCost.map((p) => [p.id, numberOrZero(p.costPrice)]));
  const marginProducts = revenueProducts
    .map((p) => {
      const cost = costMap.get(p.productId) ?? 0;
      const avgPrice = p.qty > 0 ? p.revenue / p.qty : 0;
      const margin = Math.max(0, (avgPrice - cost) * p.qty);
      return { productId: p.productId, name: p.name, qty: p.qty, margin };
    })
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 10);

  // Category/Brand sales (30d) from top 100 products
  const top100 = await prisma.saleItem.groupBy({
    by: ["productId"],
    where: { tenantId: params.tenantId, sale: { createdAt: { gte: from30, lte: now } } },
    _sum: { lineTotal: true, qty: true },
    orderBy: { _sum: { lineTotal: "desc" } },
    take: 100,
  });
  const topIds = top100.map((r) => r.productId);
  const prodMeta = await prisma.product.findMany({
    where: { tenantId: params.tenantId, id: { in: topIds } },
    select: { id: true, category: { select: { name: true } }, brand: { select: { name: true } } },
  });
  const metaMap = new Map(prodMeta.map((p) => [p.id, { category: p.category?.name ?? "Uncategorized", brand: p.brand?.name ?? "Unbranded" }]));
  const catAgg = new Map<string, number>();
  const brandAgg = new Map<string, number>();
  for (const r of top100) {
    const meta = metaMap.get(r.productId);
    const revenue = numberOrZero(r._sum.lineTotal);
    if (meta) {
      catAgg.set(meta.category, (catAgg.get(meta.category) ?? 0) + revenue);
      brandAgg.set(meta.brand, (brandAgg.get(meta.brand) ?? 0) + revenue);
    }
  }
  const topCategories = Array.from(catAgg.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));
  const topBrands = Array.from(brandAgg.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));

  // AI-ish heuristics (30 days sales)
  const sold30Rows = await prisma.saleItem.groupBy({
    by: ["productId", "name"],
    where: { tenantId: params.tenantId, sale: { createdAt: { gte: from30, lte: now } } },
    _sum: { qty: true },
    orderBy: { _sum: { qty: "asc" } },
    take: 50,
  });
  const soldMap = new Map<string, number>(sold30Rows.map((r) => [r.productId, r._sum.qty ?? 0]));

  const slowMoving = productsForValuation
    .map((p) => ({ productId: p.id, name: p.name, stock: stockMap.get(p.id) ?? 0, sold30d: soldMap.get(p.id) ?? 0 }))
    .filter((p) => p.stock > 0 && p.sold30d <= 1)
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 10);

  const reorderSuggestions = productsForValuation
    .map((p) => {
      const sold = soldMap.get(p.id) ?? 0;
      const avgDailySold = sold / 30;
      const stock = stockMap.get(p.id) ?? 0;
      const daysLeft = avgDailySold > 0 ? stock / avgDailySold : Infinity;
      const suggestedQty = avgDailySold > 0 && daysLeft < 7 ? Math.max(0, Math.ceil(avgDailySold * 14 - stock)) : 0;
      return { productId: p.id, name: p.name, stock, avgDailySold: Number(avgDailySold.toFixed(2)), suggestedQty };
    })
    .filter((r) => r.suggestedQty > 0)
    .sort((a, b) => b.suggestedQty - a.suggestedQty)
    .slice(0, 10);

  const promoSuggestions = slowMoving.map((p) => ({
    productId: p.productId,
    name: p.name,
    stock: p.stock,
    sold30d: p.sold30d,
    suggestion: "Pertimbangkan promo diskon 5-10% untuk mengurangi slow moving.",
  }));

  return {
    overview: {
      totalProducts,
      activeProducts,
      outOfStock,
      lowStock,
      expiredBatches,
      expiring7d,
      expiring30d,
      expiring90d,
      inventoryValuation,
    },
    charts: {
      salesTrend7d: days,
      topCategories,
      topBrands,
    },
    top: {
      revenueProducts: revenueProducts.slice(0, 5),
      marginProducts: marginProducts.slice(0, 5),
    },
    ai: {
      slowMoving,
      reorderSuggestions,
      promoSuggestions,
    },
  };
}

