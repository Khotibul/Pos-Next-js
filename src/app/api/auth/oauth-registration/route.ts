import { NextResponse } from "next/server";
import { createOauthRegistrationSchema } from "@/modules/auth/oauth-registration/validators";
import { createOauthRegistration } from "@/modules/auth/oauth-registration/service";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { writeErrorLog } from "@/shared/server/monitoring/log-service";

export async function POST(req: Request) {
  const limit = await checkRateLimit("register", getClientIp(req)).catch(() => ({ success: true }));
  if (!limit.success) {
    return NextResponse.json({ message: "Terlalu banyak permintaan. Coba lagi nanti." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createOauthRegistrationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Data tidak valid." }, { status: 400 });

  let row: { id: string };
  try {
    row = await createOauthRegistration(parsed.data);
  } catch (err) {
    void writeErrorLog({ source: "api:oauth-registration", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return NextResponse.json({ message: "Gagal menyimpan data. Coba lagi." }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true, id: row.id }, { status: 201 });
  res.cookies.set("oauth_reg_id", row.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
  return res;
}

