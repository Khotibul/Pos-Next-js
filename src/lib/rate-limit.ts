import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { getRedisClient } from "@/lib/redis";

type RateLimitKind = "login" | "register" | "forgotPassword" | "resendVerification" | "download" | "licenseActivation";

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

const localBuckets = new Map<string, { count: number; resetAt: number }>();
let lastLocalCleanupAt = 0;
const LOCAL_CLEANUP_INTERVAL_MS = 60_000;
const LOCAL_BUCKET_MAX_SIZE = 5_000;

function cleanupLocalBuckets(now: number) {
  if (now - lastLocalCleanupAt < LOCAL_CLEANUP_INTERVAL_MS && localBuckets.size <= LOCAL_BUCKET_MAX_SIZE) return;
  lastLocalCleanupAt = now;

  for (const [key, bucket] of localBuckets.entries()) {
    if (bucket.resetAt <= now || localBuckets.size > LOCAL_BUCKET_MAX_SIZE) {
      localBuckets.delete(key);
    }
  }
}

function windowMs(kind: RateLimitKind) {
  if (kind === "login") return 60_000;
  if (kind === "download") return 60_000;
  return 10 * 60_000;
}

function maxRequests(kind: RateLimitKind) {
  if (kind === "login") return 5;
  if (kind === "register") return 3;
  if (kind === "forgotPassword") return 3;
  if (kind === "resendVerification") return 3;
  if (kind === "licenseActivation") return 10;
  return 60;
}

function localLimit(kind: RateLimitKind, identifier: string): RateLimitResult {
  const key = `${kind}:${identifier}`;
  const now = Date.now();
  cleanupLocalBuckets(now);
  const resetAt = now + windowMs(kind);
  const current = localBuckets.get(key);

  if (!current || current.resetAt <= now) {
    localBuckets.set(key, { count: 1, resetAt });
    return { success: true, limit: maxRequests(kind), remaining: maxRequests(kind) - 1, reset: resetAt };
  }

  const next = { count: current.count + 1, resetAt: current.resetAt };
  localBuckets.set(key, next);
  return {
    success: next.count <= maxRequests(kind),
    limit: maxRequests(kind),
    remaining: Math.max(0, maxRequests(kind) - next.count),
    reset: next.resetAt,
  };
}

function limiter(kind: RateLimitKind) {
  const redis = getRedisClient();
  if (!redis) return null;

  const requests = maxRequests(kind);
  const duration = kind === "login" || kind === "download" ? "1 m" : "10 m";
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, duration),
    analytics: false,
    prefix: `rl:${kind}`,
  });
}

export async function checkRateLimit(kind: RateLimitKind, identifier: string): Promise<RateLimitResult> {
  const safeIdentifier = identifier.trim().toLowerCase() || "anonymous";
  const upstashLimiter = limiter(kind);

  if (!upstashLimiter) return localLimit(kind, safeIdentifier);

  try {
    return await upstashLimiter.limit(safeIdentifier);
  } catch {
    return localLimit(kind, safeIdentifier);
  }
}

export function getClientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "unknown";
}
