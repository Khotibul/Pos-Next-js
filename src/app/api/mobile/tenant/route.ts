import { prisma } from "@/lib/prisma";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { withApiHandler, apiOk } from "@/lib/api-response";

export const runtime = "nodejs";

/**
 * GET /api/mobile/tenant
 * Mengembalikan tenant & plan untuk mobile. Dipakai Android untuk menentukan
 * paket free (starter) vs pro/enterprise.
 * Hanya admin website (super-admin) yang bisa ubah plan via /super-admin/tenants|subscriptions|plans.
 */
export const GET = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      trialEndsAt: true,
      planId: true,
      plan: { select: { id: true, slug: true, name: true, priceMonthly: true, currency: true, trialDays: true, isActive: true } },
    },
  });

  if (!tenant) {
    return Response.json({ ok: false, message: "Tenant tidak ditemukan" }, { status: 404 });
  }

  const slug = tenant.plan?.slug ?? "starter";
  const isFree = slug === "starter" || slug === "free";
  const canUseDatabase = !isFree; // hanya pro & enterprise pakai DB & sync
  const canSync = canUseDatabase;

  return apiOk({
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      trialEndsAt: tenant.trialEndsAt,
      planId: tenant.planId,
    },
    plan: tenant.plan ?? { slug: "starter", name: "Starter", priceMonthly: 0, currency: "IDR", trialDays: 0, isActive: true },
    package: {
      slug,
      isFree,
      canUseDatabase,
      canSync,
      // detail untuk UI mobile
      canStoreTransactions: canUseDatabase,
      canViewReports: canUseDatabase,
      canStoreProducts: canUseDatabase,
    },
  });
});
