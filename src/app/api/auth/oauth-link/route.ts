import { NextResponse } from "next/server";

// Starts an explicit OAuth linking flow for Google login.
// This cookie is read by Auth.js `callbacks.signIn` to decide whether
// it may safely link a Google account to an existing credentials user.
export async function POST() {
  const res = NextResponse.json({ ok: true }, { status: 200 });
  res.cookies.set("oauth_link", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
  return res;
}

