import { withApiHandler } from "@/lib/api-response";

export const runtime = "nodejs";

// GET /api/sync/time — jam server untuk konsistensi timestamp sinkronisasi
export const GET = withApiHandler(async () => {
  return Response.json(
    { ok: true, server_time: new Date().toISOString() },
    { headers: { "cache-control": "no-store" } },
  );
});
