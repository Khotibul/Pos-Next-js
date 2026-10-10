import { z } from "zod";
import { verifyMobileToken } from "@/lib/auth/mobile-token";
import { signMobileToken } from "@/lib/auth/google-mobile";
import { withApiHandler } from "@/lib/api-response";

export const runtime = "nodejs";

const refreshSchema = z.object({ refreshToken: z.string().min(1) });

// POST /api/auth/refresh — terbitkan token baru dari token lama yang masih valid.
// Token mobile berumur 30 hari; endpoint ini memperpanjang sesi tanpa login ulang.
export const POST = withApiHandler(async (req: Request) => {
  const body = await req.json().catch(() => null);
  const parsed = refreshSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, code: "VALIDATION_ERROR", message: "Refresh token tidak valid." },
      { status: 400 },
    );
  }

  // Android mengirim token lama di field refreshToken (tidak ada refresh token terpisah)
  const fakeReq = new Request(req.url, {
    headers: { authorization: `Bearer ${parsed.data.refreshToken}` },
  });

  try {
    const auth = verifyMobileToken(fakeReq);
    const token = signMobileToken({ userId: auth.userId, email: auth.email });
    return Response.json(
      { ok: true, token },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return Response.json(
      { ok: false, code: "UNAUTHORIZED", message: "Token tidak valid atau kedaluwarsa." },
      { status: 401 },
    );
  }
});
