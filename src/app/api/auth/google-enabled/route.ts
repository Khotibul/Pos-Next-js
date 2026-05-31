import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const enabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const mobileEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  );
  return NextResponse.json({
    ok: true,
    enabled,
    mobileEnabled,
    callbackUrl: "/api/auth/callback/google",
  });
}
