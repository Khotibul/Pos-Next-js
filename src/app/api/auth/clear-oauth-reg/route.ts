import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") || "/onboarding";

  const res = NextResponse.redirect(new URL(next, url.origin));
  res.cookies.delete("oauth_reg_id");
  return res;
}
