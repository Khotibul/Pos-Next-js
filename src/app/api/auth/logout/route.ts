import { withApiHandler } from "@/lib/api-response";

export const runtime = "nodejs";

// POST /api/auth/logout — token mobile bersifat stateless (HMAC, tidak bisa dicabut
// tanpa blacklist). Endpoint ini hanya konfirmasi agar client tidak error.
export const POST = withApiHandler(async () => {
  return Response.json(
    { ok: true, message: "Logout berhasil." },
    { headers: { "cache-control": "no-store" } },
  );
});
