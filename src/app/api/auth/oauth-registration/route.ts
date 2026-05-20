import { NextResponse } from "next/server";
import { createOauthRegistrationSchema } from "@/modules/auth/oauth-registration/validators";
import { createOauthRegistration } from "@/modules/auth/oauth-registration/service";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = createOauthRegistrationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Data tidak valid." }, { status: 400 });

  const row = await createOauthRegistration(parsed.data);

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

