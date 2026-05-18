import { auth } from "@/lib/auth";

export default auth((req) => {
  // Minimal auth gate. Tenant isolation + RBAC enforced server-side (Node runtime) in layouts/actions.
  const protectedPrefixes = ["/dashboard", "/pos", "/products", "/inventory", "/customers", "/suppliers", "/reports", "/settings", "/billing", "/super-admin"];
  const isProtected = protectedPrefixes.some((p) => req.nextUrl.pathname === p || req.nextUrl.pathname.startsWith(`${p}/`));
  if (!req.auth && isProtected) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/pos/:path*", "/products/:path*", "/inventory/:path*", "/customers/:path*", "/suppliers/:path*", "/reports/:path*", "/settings/:path*", "/billing/:path*", "/super-admin/:path*"],
};
