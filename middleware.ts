import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PROTECTED_PATHS = new Set([
  "/dashboard", "/pos", "/sales", "/shifts", "/products",
  "/inventory", "/customers", "/suppliers", "/purchases",
  "/reports", "/settings", "/billing", "/super-admin", "/cashier",
]);

function isProtectedPath(pathname: string) {
  if (PROTECTED_PATHS.has(pathname)) return true;
  for (const prefix of PROTECTED_PATHS) {
    if (pathname.startsWith(`${prefix}/`)) return true;
  }
  return false;
}

export default auth(async (req) => {
  const pathname = req.nextUrl.pathname;

  if (req.headers.get("next-router-prefetch") === "1" || req.headers.get("purpose") === "prefetch") {
    return NextResponse.next();
  }

  if (isProtectedPath(pathname)) {
    if (!req.auth) {
      const url = new URL("/login", req.nextUrl.origin);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|apple-touch-icon.png|site.webmanifest|api/auth|api/public).*)",
  ],
};
