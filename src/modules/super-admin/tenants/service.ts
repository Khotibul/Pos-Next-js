import "server-only";

import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import { requireSuperAdmin } from "@/lib/super-admin";
import { normalizePagination } from "@/modules/super-admin/shared";
import type { UpsertTenantInput } from "@/modules/super-admin/tenants/validators";

function parseDateOrNull(value: string | undefined) {
  const v = (value || "").trim();
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function listTenants(params: { q?: string | null; status?: string | null; planId?: string | null; page?: number; pageSize?: number } = {}) {
  await requireSuperAdmin();
  const { page, pageSize, skip } = normalizePagination(params);
  const q = params.q?.trim() || "";
  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
            { domain: { contains: q, mode: "insensitive" as const } },
            { subdomain: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(params.status ? { status: params.status as "ACTIVE" | "TRIAL" | "SUSPENDED" | "EXPIRED" } : {}),
    ...(params.planId ? { planId: params.planId } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        subdomain: true,
        status: true,
        trialEndsAt: true,
        suspendedAt: true,
        planId: true,
        createdAt: true,
        plan: { select: { id: true, slug: true, name: true } },
        memberships: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { user: { select: { name: true, email: true } }, role: { select: { name: true } } },
        },
        _count: { select: { memberships: true, branches: true, sales: true } },
      },
    }),
    prisma.tenant.count({ where }),
  ]);
  return { items, total, page, pageSize, q };
}

export async function listPlansForSelect() {
  return prisma.plan.findMany({
    where: { isActive: true },
    orderBy: [{ isPopular: "desc" }, { priceMonthly: "asc" }],
    select: { id: true, slug: true, name: true },
  });
}

export async function upsertTenant(input: UpsertTenantInput) {
  await requireSuperAdmin();
  const domain = (input.domain || "").trim() || null;
  const subdomain = (input.subdomain || "").trim() || null;
  const planId = (input.planId || "").trim() || null;
  const trialEndsAt = parseDateOrNull(input.trialEndsAt || undefined);
  const suspendedAt = parseDateOrNull(input.suspendedAt || undefined);

  if (domain && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) throw Errors.badRequest("Domain tidak valid.");
  if (subdomain && !/^[a-z0-9-]+$/i.test(subdomain)) throw Errors.badRequest("Subdomain tidak valid.");

  if (input.id) {
    const exists = await prisma.tenant.findUnique({ where: { id: input.id }, select: { id: true } });
    if (!exists) throw Errors.notFound("Tenant tidak ditemukan.");

    const updated = await prisma.tenant.update({
      where: { id: input.id },
      data: {
        name: input.name,
        slug: input.slug,
        domain,
        subdomain,
        planId,
        status: input.status,
        trialEndsAt,
        suspendedAt,
      },
      select: { id: true },
    });
    return updated;
  }

  const created = await prisma.tenant.create({
    data: {
      name: input.name,
      slug: input.slug,
      domain,
      subdomain,
      planId,
      status: input.status ?? "TRIAL",
      trialEndsAt,
      suspendedAt,
    },
    select: { id: true },
  });
  return created;
}
