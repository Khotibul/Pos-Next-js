import "server-only";

import { CACHE_TTL, cacheKeys } from "@/shared/constants/cache-keys";
import { deleteCache, getCache, setCache } from "@/shared/server/cache/redis";
import { invalidateAuthUser } from "@/shared/server/auth/auth-cache";

export async function getCachedEmailVerified(userId: string) {
  return getCache<boolean>(cacheKeys.emailVerified(userId));
}

export async function setCachedEmailVerified(userId: string, verified: boolean) {
  await setCache(cacheKeys.emailVerified(userId), verified, CACHE_TTL.emailVerified);
}

export async function invalidateEmailVerifiedCache(userId: string) {
  await Promise.all([deleteCache(cacheKeys.emailVerified(userId)), invalidateAuthUser(userId)]);
}
