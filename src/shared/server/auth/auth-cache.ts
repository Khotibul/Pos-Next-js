import "server-only";

import { prisma } from "@/shared/server/db/prisma";
import { CACHE_TTL, cacheKeys } from "@/shared/constants/cache-keys";
import { deleteCache, getCache, setCache } from "@/shared/server/cache/redis";
import { createDevTimer } from "@/shared/utils/perf";

export type CachedAuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  isSuperAdmin: boolean;
  emailVerified: string | null;
};

function serializeAuthUser(user: {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  isSuperAdmin: boolean;
  emailVerified: Date | null;
}): CachedAuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    isSuperAdmin: user.isSuperAdmin,
    emailVerified: user.emailVerified?.toISOString() ?? null,
  };
}

export async function getCachedAuthUser(userId: string) {
  const key = cacheKeys.authUser(userId);
  const cached = await getCache<CachedAuthUser>(key);
  if (cached) return cached;

  const end = createDevTimer("auth.user.cache.miss");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, image: true, isSuperAdmin: true, emailVerified: true },
  });
  end();

  if (!user) return null;
  const payload = serializeAuthUser(user);
  await setCache(key, payload, CACHE_TTL.authUser);
  return payload;
}

export async function setCachedAuthUser(user: CachedAuthUser) {
  await setCache(cacheKeys.authUser(user.id), user, CACHE_TTL.authUser);
}

export async function invalidateAuthUser(userId: string) {
  await deleteCache([cacheKeys.authUser(userId), cacheKeys.emailVerified(userId)]);
}
