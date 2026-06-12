import "server-only";

import { recordMetric } from "@/lib/perf-monitor";
import type { MetricKey } from "@/lib/perf-monitor";

export function createDevTimer(label: string) {
  if (process.env.NODE_ENV !== "development") return () => {};
  const start = performance.now();
  return () => {
    const ms = Math.round((performance.now() - start) * 10) / 10;
    console.info(`[perf] ${label}: ${ms}ms`);
  };
}

export function createPerfTimer(metricKey: MetricKey) {
  const start = performance.now();
  return () => {
    const ms = Math.round((performance.now() - start) * 10) / 10;
    recordMetric(metricKey, ms);
  };
}
