import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type MiddlewareAuth = {
  user?: {
    id?: unknown;
  } | null;
} | null;

function isProtectedPath(pathname: string) {
  const protectedPrefixes = [
    "/dashboard",
    "/pos",
    "/products",
    "/inventory",
    "/customers",
    "/suppliers",
    "/reports",
    "/settings",
    "/billing",
    "/super-admin",
  ];
  return protectedPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isBillingPath(pathname: string) {
  return pathname === "/billing" || pathname.startsWith("/billing/");
}

function isTransactionPath(pathname: string) {
  // "expired tidak bisa transaksi" -> block POS / transaksi operasional.
  if (pathname === "/pos") return true;
  if (pathname.startsWith("/pos/")) {
    // Allow read-only pages while expired.
    if (pathname === "/pos/history" || pathname.startsWith("/pos/history/")) return false;
    if (pathname === "/pos/receipt" || pathname.startsWith("/pos/receipt/")) return false;
    return true;
  }
  if (pathname === "/purchases" || pathname.startsWith("/purchases/")) return true;
  if (pathname === "/shifts" || pathname.startsWith("/shifts/")) return true;
  return false;
}

export default auth(async (req) => {
  const pathname = req.nextUrl.pathname;
  const isProtected = isProtectedPath(pathname);

  if (!req.auth && isProtected) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Super Admin SaaS area is not tenant-bound.
  if (pathname === "/super-admin" || pathname.startsWith("/super-admin/")) {
    return NextResponse.next();
  }

  if (!isProtected) return NextResponse.next();

  const session = req.auth as MiddlewareAuth;
  const userId = typeof session?.user?.id === "string" ? session.user.id : null;
  if (!userId) return NextResponse.next();

  const tenantId = req.cookies.get("active_tenant_id")?.value ?? null;
  if (!tenantId) return NextResponse.next();

  // Enforce tenant isolation + status checks in middleware (Node runtime).
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isSuperAdmin: true,
      emailVerified: true,
      memberships: {
        where: { tenantId },
        select: { tenant: { select: { status: true, trialEndsAt: true } } },
      },
    },
  });

  if (!user) return NextResponse.next();

  // Enforce email verification before accessing the app (except super admin).
  if (!user.isSuperAdmin && !user.emailVerified) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("error", "EMAIL_NOT_VERIFIED");
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  const hasMembership = user.memberships.length > 0;
  if (!user.isSuperAdmin && !hasMembership) {
    const res = NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
    res.cookies.delete("active_tenant_id");
    return res;
  }

  // For super admin, tenant may not be in memberships; read tenant status directly.
  const tenantFromMembership = user.memberships[0]?.tenant ?? null;
  const tenantFromDb = tenantFromMembership
    ? null
    : await prisma.tenant.findUnique({ where: { id: tenantId }, select: { status: true, trialEndsAt: true } });

  const tenantStatus = tenantFromMembership?.status ?? tenantFromDb?.status ?? null;
  const tenantTrialEndsAt = tenantFromMembership?.trialEndsAt ?? tenantFromDb?.trialEndsAt ?? null;

  if (!tenantStatus) return NextResponse.next();

  // Trial expired -> treat as expired.
  const now = Date.now();
  if (tenantStatus === "TRIAL" && tenantTrialEndsAt && tenantTrialEndsAt.getTime() < now) {
    const url = new URL("/billing", req.nextUrl.origin);
    url.searchParams.set("reason", "trial_expired");
    return NextResponse.redirect(url);
  }

  // Suspended -> only billing.
  if (tenantStatus === "SUSPENDED" && !isBillingPath(pathname)) {
    const url = new URL("/billing", req.nextUrl.origin);
    url.searchParams.set("reason", "suspended");
    return NextResponse.redirect(url);
  }

  // Expired -> block transactions only (POS/shifts/purchases). Allow read-only pages.
  if (tenantStatus === "EXPIRED" && isTransactionPath(pathname) && !isBillingPath(pathname)) {
    const url = new URL("/billing", req.nextUrl.origin);
    url.searchParams.set("reason", "expired");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/pos/:path*", "/products/:path*", "/inventory/:path*", "/customers/:path*", "/suppliers/:path*", "/reports/:path*", "/settings/:path*", "/billing/:path*", "/super-admin/:path*"],
};

export const runtime = "nodejs";
