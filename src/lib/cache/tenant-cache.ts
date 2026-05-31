import "server-only";

import { CACHE_TTL, cacheKeys } from "@/lib/cache-keys";
import { deleteCache, getCache, setCache } from "@/lib/redis";

export type CachedTenantStatus = {
  status: "ACTIVE" | "TRIAL" | "SUSPENDED" | "EXPIRED";
  trialEndsAt: string | null;
};

export type CachedTenantMembership = {
  exists: boolean;
  branchId: string | null;
  roleName: string | null;
};

export type CachedTenantAccess = CachedTenantStatus & {
  isSuperAdmin: boolean;
  membership: CachedTenantMembership;
};

export async function getCachedTenantStatus(tenantId: string) {
  return getCache<CachedTenantStatus>(cacheKeys.tenantStatus(tenantId));
}

export async function setCachedTenantStatus(tenantId: string, status: CachedTenantStatus) {
  await setCache(cacheKeys.tenantStatus(tenantId), status, CACHE_TTL.tenantStatus);
}

export async function getCachedTenantMembership(tenantId: string, userId: string) {
  return getCache<CachedTenantMembership>(cacheKeys.tenantMembership(tenantId, userId));
}

export async function setCachedTenantMembership(tenantId: string, userId: string, membership: CachedTenantMembership) {
  await setCache(cacheKeys.tenantMembership(tenantId, userId), membership, CACHE_TTL.membership);
}

export async function getCachedTenantAccess(tenantId: string, userId: string) {
  return getCache<CachedTenantAccess>(cacheKeys.tenantAccess(tenantId, userId));
}

export async function setCachedTenantAccess(tenantId: string, userId: string, access: CachedTenantAccess) {
  await setCache(cacheKeys.tenantAccess(tenantId, userId), access, CACHE_TTL.tenantAccess);
}

export async function invalidateTenantAccessCache(tenantId: string, userId: string) {
  await deleteCache([
    cacheKeys.tenantAccess(tenantId, userId),
    cacheKeys.tenantMembership(tenantId, userId),
    cacheKeys.tenantContext(tenantId, userId),
  ]);
}
