import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateMobileGoogleIdToken } from "@/lib/auth/google-mobile";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  idToken: z.string().min(20),
});

const errorMap: Record<string, string> = {
  GOOGLE_TOKEN_INVALID: "Token Google tidak valid. Silakan login ulang.",
  GOOGLE_EMAIL_NOT_VERIFIED: "Email Google belum terverifikasi.",
  GOOGLE_ACCOUNT_IN_USE: "Akun Google ini sudah terhubung ke user lain.",
};

export async function POST(req: Request) {
  const limit = await checkRateLimit("login", `mobile-google:${getClientIp(req)}`);
  if (!limit.success) {
    return NextResponse.json({ ok: false, code: "RATE_LIMITED", message: "Terlalu banyak percobaan login." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, code: "GOOGLE_TOKEN_INVALID", message: "Token Google tidak valid." }, { status: 400 });
  }

  try {
    const result = await authenticateMobileGoogleIdToken(parsed.data.idToken);
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "GOOGLE_TOKEN_INVALID";
    return NextResponse.json(
      { ok: false, code, message: errorMap[code] ?? "Login Google mobile gagal. Silakan coba lagi." },
      { status: code === "GOOGLE_TOKEN_INVALID" ? 401 : 400 },
    );
  }
}
