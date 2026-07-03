import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPrefixes = [
  "/dashboard", "/pos", "/sales", "/shifts", "/products",
  "/inventory", "/customers", "/suppliers", "/purchases",
  "/reports", "/settings", "/billing", "/super-admin", "/cashier",
];

function isProtectedPath(pathname: string) {
  for (let i = 0; i < protectedPrefixes.length; i++) {
    const p = protectedPrefixes[i];
    if (pathname === p || pathname.startsWith(p + "/")) return true;
  }
  return false;
}

const SESSION_COOKIE = "authjs.session-token";

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip prefetch — no auth needed, avoids session decode overhead.
  if (req.headers.get("next-router-prefetch") === "1" || req.headers.get("purpose") === "prefetch") {
    return NextResponse.next();
  }

  // Fast path: not a protected route, skip entirely.
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  // Check session cookie existence — fast cookie read, no JWT decode.
  // Actual JWT validation is done in server components via auth().
  const hasSession = req.cookies.has(SESSION_COOKIE)
    || req.cookies.has("__Secure-" + SESSION_COOKIE);

  if (!hasSession) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/pos/:path*",
    "/sales/:path*",
    "/shifts/:path*",
    "/products/:path*",
    "/inventory/:path*",
    "/customers/:path*",
    "/suppliers/:path*",
    "/purchases/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/billing/:path*",
    "/super-admin/:path*",
    "/cashier/:path*",
  ],
};
