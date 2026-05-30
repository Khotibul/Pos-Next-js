import { NextResponse } from "next/server";
import { getLatestRelease } from "@/config/downloads";

export const runtime = "nodejs";

function toAbsolute(url: string, reqUrl: string) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return new URL(url, reqUrl).toString();
}

export async function GET(request: Request) {
  const r = getLatestRelease("WINDOWS");
  if (!r) return NextResponse.json({ ok: false, message: "Rilis Windows belum tersedia." }, { status: 404 });
  const abs = toAbsolute(r.downloadUrl, request.url);
  if (!abs) return NextResponse.json({ ok: false, message: "URL download tidak valid." }, { status: 400 });
  return NextResponse.redirect(abs);
}

