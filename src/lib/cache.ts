import "server-only";

import { deleteCache, deleteCacheByPattern, getCache, setCache } from "@/lib/redis";

export async function rememberCache<T>(params: {
  key: string;
  ttl: number;
  fetcher: () => Promise<T>;
}): Promise<T> {
  const cached = await getCache<T>(params.key);
  if (cached !== null) return cached;

  const value = await params.fetcher();
  await setCache(params.key, value, params.ttl);
  return value;
}

export async function invalidateTenantCache(tenantId: string) {
  await Promise.all([
    deleteCacheByPattern(`tenant:settings:${tenantId}*`),
    deleteCacheByPattern(`dashboard:tenant:${tenantId}:*`),
    deleteCacheByPattern(`product:*:${tenantId}:*`),
    deleteCacheByPattern(`auth:permissions:${tenantId}:*`),
  ]);
}

export async function invalidateProductCache(tenantId: string) {
  await Promise.all([
    deleteCacheByPattern(`product:*:${tenantId}:*`),
    deleteCache(`product:overview:${tenantId}`),
    deleteCacheByPattern(`dashboard:tenant:${tenantId}:*`),
  ]);
}

export async function invalidateDashboardCache(tenantId: string) {
  await deleteCacheByPattern(`dashboard:tenant:${tenantId}:*`);
}

export async function invalidatePermissionCache(tenantId: string, userId?: string | null) {
  if (userId) {
    await deleteCache(`auth:permissions:${tenantId}:${userId}`);
    return;
  }
  await deleteCacheByPattern(`auth:permissions:${tenantId}:*`);
}
