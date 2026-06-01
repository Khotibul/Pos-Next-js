import "server-only";

import { CACHE_TTL, cacheKeys } from "@/lib/cache-keys";
import { deleteCache, getCache, setCache } from "@/lib/redis";

export type CachedLayoutContext = {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  isSuperAdmin: boolean;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantStatus: "ACTIVE" | "TRIAL" | "SUSPENDED" | "EXPIRED";
  tenantTrialEndsAt: string | null;
  branchId: string;
  branchName: string | null;
  permissions: string[];
  roleName: string | null;
  roleId: string | null;
  subscriptionStatus: string | null;
  memberships: Array<{ tenantId: string; tenantName: string; tenantSlug: string; tenantStatus: string }>;
};

export async function getCachedTenantContext(userId: string, tenantId: string) {
  return getCache<CachedLayoutContext>(cacheKeys.tenantContext(tenantId, userId));
}

export async function setCachedTenantContext(userId: string, tenantId: string, context: CachedLayoutContext) {
  await setCache(cacheKeys.tenantContext(tenantId, userId), context, CACHE_TTL.tenantContext);
}

export async function invalidateTenantContext(userId: string, tenantId: string) {
  await deleteCache([cacheKeys.tenantContext(tenantId, userId), cacheKeys.sidebar(tenantId, userId)]);
}
