import { NextResponse } from "next/server";
import { getLatestRelease } from "@/config/downloads";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

function toAbsolute(url: string, reqUrl: string) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return new URL(url, reqUrl).toString();
}

export async function GET(request: Request) {
  const limit = await checkRateLimit("download", `${getClientIp(request)}:windows`);
  if (!limit.success) return NextResponse.json({ ok: false, message: "Terlalu banyak request download." }, { status: 429 });

  const r = getLatestRelease("WINDOWS");
  if (!r) return NextResponse.json({ ok: false, message: "Rilis Windows belum tersedia." }, { status: 404 });
  const abs = toAbsolute(r.downloadUrl, request.url);
  if (!abs) return NextResponse.json({ ok: false, message: "URL download tidak valid." }, { status: 400 });
  return NextResponse.redirect(abs);
}
