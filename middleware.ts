import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

function isProtectedPath(pathname: string) {
  const protectedPrefixes = [
    "/dashboard",
    "/pos",
    "/sales",
    "/shifts",
    "/products",
    "/inventory",
    "/customers",
    "/suppliers",
    "/purchases",
    "/reports",
    "/settings",
    "/billing",
    "/super-admin",
  ];
  return protectedPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default auth(async (req) => {
  const pathname = req.nextUrl.pathname;
  if (req.headers.get("next-router-prefetch") === "1" || req.headers.get("purpose") === "prefetch") {
    return NextResponse.next();
  }

  const isProtected = isProtectedPath(pathname);

  if (!req.auth && isProtected) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

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
  ],
};

export const runtime = "nodejs";
