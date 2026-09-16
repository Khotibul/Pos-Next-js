import { withApiHandler } from "@/lib/api-response";
import { requireSuperAdmin } from "@/lib/super-admin";
import { getMetricsSummary, getCacheHitRatio } from "@/lib/perf-monitor";

export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
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
});
