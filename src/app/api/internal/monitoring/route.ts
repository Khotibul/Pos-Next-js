import { requireSuperAdmin } from "@/lib/super-admin";
import { getMetricsSummary, getCacheHitRatio } from "@/lib/perf-monitor";

export async function GET() {
  await requireSuperAdmin();

  const metrics = getMetricsSummary();
  const cacheHitRatio = getCacheHitRatio();

  return Response.json({
    ok: true,
    data: {
      metrics,
      cacheHitRatio,
      serverTime: new Date().toISOString(),
    },
  });
}
