import "server-only";

import { getRedisClient } from "@/lib/redis";

export type MetricKey = "login" | "transaction" | "import" | "query" | "cache.hit" | "cache.miss" | "dashboard" | "pos.render";

type MetricSample = {
  key: MetricKey;
  durationMs: number;
  timestamp: string;
};

type MetricAggregate = {
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
  avgMs: number;
};

const localMetrics = new Map<MetricKey, number[]>();
const LOCAL_MAX_SAMPLES = 100;

function getLocalSamples(key: MetricKey): number[] {
  let arr = localMetrics.get(key);
  if (!arr) {
    arr = [];
    localMetrics.set(key, arr);
  }
  return arr;
}

export function recordMetric(key: MetricKey, durationMs: number) {
  const redis = getRedisClient();
  if (redis) {
    const sample: MetricSample = { key, durationMs, timestamp: new Date().toISOString() };
    redis.lpush("perf:metrics", JSON.stringify(sample)).catch(() => {});
    redis.ltrim("perf:metrics", 0, 999).catch(() => {});
  }
  const samples = getLocalSamples(key);
  samples.push(durationMs);
  if (samples.length > LOCAL_MAX_SAMPLES) samples.shift();
}

export function startTimer() {
  const start = performance.now();
  return (key: MetricKey) => {
    const ms = Math.round((performance.now() - start) * 10) / 10;
    recordMetric(key, ms);
    return ms;
  };
}

export function getMetricsSummary(): Record<string, MetricAggregate> {
  const result: Record<string, MetricAggregate> = {};

  const allKeys: MetricKey[] = ["login", "transaction", "import", "query", "cache.hit", "cache.miss", "dashboard", "pos.render"];

  for (const key of allKeys) {
    const samples = localMetrics.get(key);
    if (!samples || samples.length === 0) {
      result[key] = { count: 0, totalMs: 0, minMs: 0, maxMs: 0, avgMs: 0 };
      continue;
    }
    const totalMs = samples.reduce((a, b) => a + b, 0);
    result[key] = {
      count: samples.length,
      totalMs: Math.round(totalMs * 10) / 10,
      minMs: Math.min(...samples),
      maxMs: Math.max(...samples),
      avgMs: Math.round((totalMs / samples.length) * 10) / 10,
    };
  }

  return result;
}

export function getCacheHitRatio(): number {
  const hits = localMetrics.get("cache.hit");
  const misses = localMetrics.get("cache.miss");
  const hitCount = hits ? hits.length : 0;
  const missCount = misses ? misses.length : 0;
  const total = hitCount + missCount;
  if (total === 0) return 0;
  return Math.round((hitCount / total) * 10000) / 100;
}

export function recordCacheHit() {
  recordMetric("cache.hit", 0);
}

export function recordCacheMiss() {
  recordMetric("cache.miss", 0);
}
