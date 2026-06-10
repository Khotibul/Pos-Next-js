import "server-only";

import { getCache, setCache, deleteCache } from "@/lib/redis";

type CachedProduct = {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
};

export async function getCachedProducts(
  tenantId: string,
  productIds: string[],
): Promise<Map<string, CachedProduct>> {
  const result = new Map<string, CachedProduct>();
  const uncachedIds: string[] = [];

  for (const id of productIds) {
    const cached = await getCache<CachedProduct>(`tx:product:${tenantId}:${id}`);
    if (cached) {
      result.set(id, cached);
    } else {
      uncachedIds.push(id);
    }
  }

  if (uncachedIds.length > 0) {
    const { prisma } = await import("@/lib/prisma");
    const products = await prisma.product.findMany({
      where: { tenantId, id: { in: uncachedIds }, isActive: true },
      select: { id: true, name: true, sku: true, sellingPrice: true },
    });

    for (const p of products) {
      const cached: CachedProduct = {
        id: p.id,
        name: p.name,
        sku: p.sku,
        sellingPrice: Number(p.sellingPrice),
      };
      result.set(p.id, cached);
      await setCache(`tx:product:${tenantId}:${p.id}`, cached, 300);
    }
  }

  return result;
}

export async function invalidateCachedProduct(tenantId: string, productId: string) {
  await deleteCache(`tx:product:${tenantId}:${productId}`);
}

export async function invalidateAllCachedProducts(tenantId: string) {
  const { deleteCacheByPattern } = await import("@/lib/redis");
  await deleteCacheByPattern(`tx:product:${tenantId}:*`);
}

const IDEMPOTENCY_TTL = 10;

export async function checkIdempotencyKey(tenantId: string, key: string): Promise<boolean> {
  const cacheKey = `tx:idempotency:${tenantId}:${key}`;
  const existing = await getCache<string>(cacheKey);
  if (existing) return false;
  await setCache(cacheKey, "1", IDEMPOTENCY_TTL);
  return true;
}

export async function releaseIdempotencyKey(tenantId: string, key: string) {
  await deleteCache(`tx:idempotency:${tenantId}:${key}`);
}

type ReceiptCacheData = {
  sale: {
    id: string;
    invoiceNo: string;
    status: string;
    createdAt: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    items: Array<{
      id: string;
      name: string;
      sku: string;
      price: number;
      qty: number;
      lineTotal: number;
    }>;
    payments: Array<{
      id: string;
      method: string;
      amount: number;
      receivedAmount: number;
      changeAmount: number;
      reference: string | null;
    }>;
  };
  printer: Record<string, unknown>;
};

export async function cacheReceiptData(
  saleId: string,
  tenantId: string,
  data: ReceiptCacheData,
) {
  await setCache(`tx:receipt:${tenantId}:${saleId}`, data, 120);
}

export async function getCachedReceiptData(
  saleId: string,
  tenantId: string,
): Promise<ReceiptCacheData | null> {
  return getCache<ReceiptCacheData>(`tx:receipt:${tenantId}:${saleId}`);
}
