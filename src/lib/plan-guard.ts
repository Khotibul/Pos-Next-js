import "server-only";
import { prisma } from "@/lib/prisma";

export type PlanCheckResult = {
  slug: string;
  isFree: boolean;
  canUseDatabase: boolean;
  canSync: boolean;
};

/**
 * Cek paket tenant untuk mobile. Hanya pro & enterprise boleh pakai DB & sync.
 * Starter/free = nonaktif penyimpanan transaksi, laporan, product ke PostgreSQL.
 * Penentuan paket hanya via super-admin website (/super-admin/plans|tenants|subscriptions).
 */
export async function getTenantPlan(tenantId: string): Promise<PlanCheckResult> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: { select: { slug: true } } },
  });
  const slug = tenant?.plan?.slug ?? "starter";
  const isFree = slug === "starter" || slug === "free";
  return {
    slug,
    isFree,
    canUseDatabase: !isFree,
    canSync: !isFree,
  };
}

export async function requireCanUseDatabase(tenantId: string) {
  const plan = await getTenantPlan(tenantId);
  if (!plan.canUseDatabase) {
    throw Object.assign(new Error("PLAN_FREE_NO_DB"), { status: 403, plan });
  }
  return plan;
}
