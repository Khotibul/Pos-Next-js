import "server-only";

import { getCache, setCache, deleteCache, getRedisClient, isRedisEnabled } from "@/lib/redis";
import { createDevTimer } from "@/lib/perf";

type CachedProduct = {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  wholesalePrice: number;
  wholesaleDiscountPercent: number;
  wholesaleMinQty: number;
};

// In-memory LRU untuk transaksi padat (hindari Redis roundtrip untuk produk laris)
const memCache = new Map<string, { value: CachedProduct; exp: number }>();
function getMemCache(key: string): CachedProduct | null {
  const e = memCache.get(key);
  if (!e) return null;
  if (Date.now() > e.exp) { memCache.delete(key); return null; }
  return e.value;
}
function setMemCache(key: string, value: CachedProduct, ttlSec: number) {
  memCache.set(key, { value, exp: Date.now() + ttlSec * 1000 });
  if (memCache.size > 800) {
    const first = memCache.keys().next().value as string | undefined;
    if (first) memCache.delete(first);
  }
}
function delMemCache(key: string) { memCache.delete(key); }

export async function getCachedProducts(
  tenantId: string,
  productIds: string[],
): Promise<Map<string, CachedProduct>> {
  const result = new Map<string, CachedProduct>();
  if (productIds.length === 0) return result;

  const uncachedIds: string[] = [];
  const memMissIds: string[] = [];

  // 1. Cek memCache dulu (0ms)
  for (const id of productIds) {
    const memKey = `tx:product:${tenantId}:${id}`;
    const memVal = getMemCache(memKey);
    if (memVal) result.set(id, memVal);
    else memMissIds.push(id);
  }
  if (memMissIds.length === 0) return result;

  const redis = isRedisEnabled() ? getRedisClient() : null;
  if (redis) {
    const endMget = createDevTimer("tx.productCache.mget");
    const keys = memMissIds.map((id) => `tx:product:${tenantId}:${id}`);
    const cachedValues = await redis.mget<Array<{ value: CachedProduct } | null>>(...keys);
    endMget();

    for (let i = 0; i < memMissIds.length; i++) {
      const val = cachedValues?.[i]?.value ?? null;
      if (val) {
        result.set(memMissIds[i], val);
        setMemCache(`tx:product:${tenantId}:${memMissIds[i]}`, val, 30);
      } else {
        uncachedIds.push(memMissIds[i]);
      }
    }
  } else {
    const entries = await Promise.all(
      memMissIds.map((id) =>
        getCache<CachedProduct>(`tx:product:${tenantId}:${id}`).then((cached) => ({ id, cached })),
      ),
    );
    for (const { id, cached } of entries) {
      if (cached) {
        result.set(id, cached);
        setMemCache(`tx:product:${tenantId}:${id}`, cached, 30);
      } else {
        uncachedIds.push(id);
      }
    }
  }

  if (uncachedIds.length > 0) {
    const endDbFetch = createDevTimer("tx.productCache.dbFetch");
    const { prisma } = await import("@/lib/prisma");
    const products = await prisma.product.findMany({
      where: { tenantId, id: { in: uncachedIds }, isActive: true },
      select: { id: true, name: true, sku: true, sellingPrice: true, wholesalePrice: true, wholesaleDiscountPercent: true, wholesaleMinQty: true },
    });
    endDbFetch();

    const endSetBatch = createDevTimer("tx.productCache.setBatch");
    const cacheEntries: Array<{ key: string; value: CachedProduct; ttl: number }> = [];
    for (const p of products) {
      const cached: CachedProduct = {
        id: p.id,
        name: p.name,
        sku: p.sku,
        sellingPrice: Number(p.sellingPrice),
        wholesalePrice: Number((p as unknown as { wholesalePrice: unknown }).wholesalePrice ?? 0),
        wholesaleDiscountPercent: Number((p as unknown as { wholesaleDiscountPercent: unknown }).wholesaleDiscountPercent ?? 0),
        wholesaleMinQty: Number((p as unknown as { wholesaleMinQty: unknown }).wholesaleMinQty ?? 0),
      };
      result.set(p.id, cached);
      setMemCache(`tx:product:${tenantId}:${p.id}`, cached, 30);
      cacheEntries.push({ key: `tx:product:${tenantId}:${p.id}`, value: cached, ttl: 600 });
    }
    if (redis && cacheEntries.length > 0) {
      const pipeline = redis.pipeline();
      for (const entry of cacheEntries) {
        pipeline.set(entry.key, { value: entry.value, storedAt: new Date().toISOString() }, { ex: entry.ttl });
      }
      await pipeline.exec();
    } else {
      await Promise.all(cacheEntries.map((entry) => setCache(entry.key, entry.value, entry.ttl)));
    }
    endSetBatch();
  }

  return result;
}

export async function invalidateCachedProduct(tenantId: string, productId: string) {
  delMemCache(`tx:product:${tenantId}:${productId}`);
  await deleteCache(`tx:product:${tenantId}:${productId}`);
}

export async function invalidateAllCachedProducts(tenantId: string) {
  const { deleteCacheByPattern } = await import("@/lib/redis");
  await deleteCacheByPattern(`tx:product:${tenantId}:*`);
}

const IDEMPOTENCY_TTL = 60;

export async function checkIdempotencyKey(tenantId: string, key: string): Promise<boolean> {
  const cacheKey = `tx:idempotency:${tenantId}:${key}`;
  const redis = isRedisEnabled() ? getRedisClient() : null;
  if (redis) {
    try {
      const result = await redis.set(cacheKey, { value: "1", storedAt: new Date().toISOString() }, { ex: IDEMPOTENCY_TTL, nx: true });
      return result === "OK";
    } catch {
      // Fallback to regular cache flow below.
    }
  }
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
