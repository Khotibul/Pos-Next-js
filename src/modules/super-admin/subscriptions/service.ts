import "server-only";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/super-admin";
import { normalizePagination, stringOrNull } from "@/modules/super-admin/shared";
import { invalidateTenantCache } from "@/lib/cache";
import type { UpdateSubscriptionInput } from "@/modules/super-admin/subscriptions/validators";

export async function listSuperAdminSubscriptions(params: { q?: string | null; page?: number; pageSize?: number } = {}) {
  await requireSuperAdmin();
  const { page, pageSize, skip } = normalizePagination(params);
  const q = params.q?.trim() || "";
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { slug: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [items, total, plans] = await Promise.all([
    prisma.tenant.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        trialEndsAt: true,
        planId: true,
        plan: { select: { id: true, name: true, slug: true, priceMonthly: true, currency: true } },
        createdAt: true,
      },
    }),
    prisma.tenant.count({ where }),
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { priceMonthly: "asc" }, select: { id: true, name: true, slug: true } }),
  ]);
  return { items, total, plans, page, pageSize, q };
}

export async function updateSuperAdminSubscription(input: UpdateSubscriptionInput) {
  await requireSuperAdmin();
  const trialDateText = stringOrNull(input.trialEndsAt);
  const trialEndsAt = trialDateText ? new Date(trialDateText) : null;
  const updated = await prisma.tenant.update({
    where: { id: input.tenantId },
    data: {
      planId: stringOrNull(input.planId),
      status: input.status,
      trialEndsAt: trialEndsAt && !Number.isNaN(trialEndsAt.getTime()) ? trialEndsAt : null,
      suspendedAt: input.status === "SUSPENDED" ? new Date() : null,
    },
    select: { id: true },
  });
  await invalidateTenantCache(updated.id);
  return updated;
}
