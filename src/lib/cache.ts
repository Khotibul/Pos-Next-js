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
    deleteCacheByPattern(`permissions:${tenantId}:*`),
    deleteCacheByPattern(`auth:tenant-context:*:${tenantId}`),
    deleteCacheByPattern(`layout:sidebar:*:${tenantId}`),
    deleteCacheByPattern(`tenant:access:${tenantId}:*`),
    deleteCacheByPattern(`tenant:membership:${tenantId}:*`),
    deleteCache(`tenant:status:${tenantId}`),
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
    await Promise.all([
      deleteCache(`permissions:${tenantId}:${userId}`),
      deleteCache(`auth:tenant-context:${userId}:${tenantId}`),
      deleteCache(`layout:sidebar:${userId}:${tenantId}`),
      deleteCache(`tenant:access:${tenantId}:${userId}`),
      deleteCache(`tenant:membership:${tenantId}:${userId}`),
    ]);
    return;
  }
  await Promise.all([
    deleteCacheByPattern(`permissions:${tenantId}:*`),
    deleteCacheByPattern(`auth:tenant-context:*:${tenantId}`),
    deleteCacheByPattern(`layout:sidebar:*:${tenantId}`),
    deleteCacheByPattern(`tenant:access:${tenantId}:*`),
    deleteCacheByPattern(`tenant:membership:${tenantId}:*`),
  ]);
}
