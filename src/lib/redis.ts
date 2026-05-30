import "server-only";

import { Redis } from "@upstash/redis";

type CacheEnvelope<T> = {
  value: T;
  storedAt: string;
};

let redisInstance: Redis | null | undefined;

export function getRedisClient() {
  if (redisInstance !== undefined) return redisInstance;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    redisInstance = null;
    return redisInstance;
  }

  redisInstance = new Redis({ url, token });
  return redisInstance;
}

export function isRedisEnabled() {
  return getRedisClient() !== null;
}

export async function getCache<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const cached = await redis.get<CacheEnvelope<T>>(key);
    return cached?.value ?? null;
  } catch {
    return null;
  }
}

export async function setCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.set(key, { value, storedAt: new Date().toISOString() } satisfies CacheEnvelope<T>, { ex: ttlSeconds });
  } catch {
    // Redis is an optional performance layer; never fail the request because of cache.
  }
}

export async function deleteCache(keys: string | string[]): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  const list = Array.isArray(keys) ? keys : [keys];
  if (list.length === 0) return;

  try {
    await redis.del(...list);
  } catch {
    // no-op
  }
}

export async function deleteCacheByPattern(pattern: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch {
    // no-op
  }
}

export async function pingRedis(): Promise<"connected" | "disabled" | "error"> {
  const redis = getRedisClient();
  if (!redis) return "disabled";

  try {
    await redis.ping();
    return "connected";
  } catch {
    return "error";
  }
}
