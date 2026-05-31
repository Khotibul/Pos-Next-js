import "server-only";

import { CACHE_TTL, cacheKeys } from "@/lib/cache-keys";
import { deleteCache, getCache, setCache } from "@/lib/redis";

export async function getCachedEmailVerified(userId: string) {
  return getCache<boolean>(cacheKeys.emailVerified(userId));
}

export async function setCachedEmailVerified(userId: string, verified: boolean) {
  await setCache(cacheKeys.emailVerified(userId), verified, CACHE_TTL.emailVerified);
}

export async function invalidateEmailVerifiedCache(userId: string) {
  await deleteCache(cacheKeys.emailVerified(userId));
}
