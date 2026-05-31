import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Errors } from "@/lib/errors";
import { CACHE_TTL, cacheKeys } from "@/lib/cache-keys";
import { getCache, setCache } from "@/lib/redis";

export type TenantContext = {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  isSuperAdmin: boolean;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantStatus: "ACTIVE" | "TRIAL" | "SUSPENDED" | "EXPIRED";
  tenantTrialEndsAt: Date | null;
  branchId: string;
  branchName: string | null;
  permissions: string[];
  roleName: string | null;
  memberships: Array<{ tenantId: string; tenantName: string; tenantSlug: string; tenantStatus: string }>;
};

type CachedTenantContext = Omit<TenantContext, "tenantTrialEndsAt"> & {
  tenantTrialEndsAt: string | null;
};

function cacheContext(ctx: TenantContext): CachedTenantContext {
  return {
    ...ctx,
    tenantTrialEndsAt: ctx.tenantTrialEndsAt?.toISOString() ?? null,
  };
}

function hydrateContext(ctx: CachedTenantContext): TenantContext {
  return {
    ...ctx,
    tenantTrialEndsAt: ctx.tenantTrialEndsAt ? new Date(ctx.tenantTrialEndsAt) : null,
  };
}

async function resolveOrCreateActiveBranch(params: { tenantId: string }) {
  const active = await prisma.branch.findFirst({
    where: { tenantId: params.tenantId, isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  if (active) return active;

  const anyBranch = await prisma.branch.findFirst({
    where: { tenantId: params.tenantId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, isActive: true },
  });
  if (anyBranch) {
    if (!anyBranch.isActive) {
      await prisma.branch.update({ where: { id: anyBranch.id }, data: { isActive: true } }).catch(() => {});
    }
    return { id: anyBranch.id, name: anyBranch.name };
  }

  // Self-heal: older tenants may exist without any branch record.
  try {
    const created = await prisma.branch.create({
      data: { tenantId: params.tenantId, code: "MAIN", name: "Main Branch", isActive: true },
      select: { id: true, name: true },
    });
    return created;
  } catch {
    // If a race created it concurrently, just re-fetch.
    const fallback = await prisma.branch.findFirst({
      where: { tenantId: params.tenantId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });
    if (fallback) return fallback;
  }

  throw Errors.forbidden("Cabang tidak ditemukan. Tambahkan cabang dulu.");
}

async function resolvePermissionCache(params: { tenantId: string; userId: string; fallback: string[] }) {
  const key = cacheKeys.permissions(params.tenantId, params.userId);
  const cached = await getCache<string[]>(key);
  if (cached) return cached;
  await setCache(key, params.fallback, CACHE_TTL.permissions);
  return params.fallback;
}

export const getTenantContext = cache(async (): Promise<TenantContext> => {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const cookieStore = await cookies();
  const cookieTenantId = cookieStore.get("active_tenant_id")?.value ?? null;
  if (cookieTenantId) {
    const cached = await getCache<CachedTenantContext>(cacheKeys.tenantContext(cookieTenantId, userId));
    if (cached) return hydrateContext(cached);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      isSuperAdmin: true,
      memberships: {
        select: {
          tenantId: true,
          branchId: true,
          branch: { select: { id: true, name: true } },
          tenant: { select: { name: true, slug: true, status: true, trialEndsAt: true } },
          role: {
            select: {
              name: true,
              permissions: {
                select: { permission: { select: { key: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!user) throw Errors.unauthorized("User not found.");

  // Super Admin can access all tenants.
  if (user.isSuperAdmin) {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, slug: true, status: true, trialEndsAt: true },
      take: 5000,
    });

    const memberships = tenants.map((t) => ({
      tenantId: t.id,
      tenantName: t.name,
      tenantSlug: t.slug,
      tenantStatus: t.status,
    }));

    const activeTenantId =
      (cookieTenantId && tenants.find((t) => t.id === cookieTenantId)?.id) || tenants[0]?.id;

    if (!activeTenantId) throw Errors.forbidden("Tenant tidak ditemukan.");

    const activeTenant = tenants.find((t) => t.id === activeTenantId) ?? null;
    if (!activeTenant) throw Errors.forbidden("Tenant tidak valid.");

    const activeMembership = user.memberships.find((m) => m.tenantId === activeTenantId) ?? null;
    const permissions = await resolvePermissionCache({
      tenantId: activeTenantId,
      userId: user.id,
      fallback: (activeMembership?.role?.permissions ?? []).map((rp) => rp.permission.key),
    });
    const roleName = activeMembership?.role?.name ?? null;

    const activeBranch =
      (activeMembership?.branchId
        ? { id: activeMembership.branchId, name: activeMembership.branch?.name ?? null }
        : null) ?? (await resolveOrCreateActiveBranch({ tenantId: activeTenantId }));

    const ctx = {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userImage: user.image,
      isSuperAdmin: true,
      tenantId: activeTenant.id,
      tenantName: activeTenant.name,
      tenantSlug: activeTenant.slug,
      tenantStatus: activeTenant.status,
      tenantTrialEndsAt: activeTenant.trialEndsAt,
      branchId: activeBranch.id,
      branchName: activeBranch.name ?? null,
      permissions,
      roleName,
      memberships,
    };
    await setCache(cacheKeys.tenantContext(activeTenant.id, user.id), cacheContext(ctx), 60);
    return ctx;
  }

  const memberships = user.memberships.map((m) => ({
    tenantId: m.tenantId,
    tenantName: m.tenant.name,
    tenantSlug: m.tenant.slug,
    tenantStatus: m.tenant.status,
  }));

  if (memberships.length === 0) {
    throw Errors.forbidden("Anda belum tergabung ke tenant manapun.");
  }

  const activeTenantId =
    (cookieTenantId && memberships.find((m) => m.tenantId === cookieTenantId)?.tenantId) || memberships[0]?.tenantId;

  if (!activeTenantId) throw Errors.forbidden("Tenant tidak ditemukan.");

  const activeMembership = user.memberships.find((m) => m.tenantId === activeTenantId) ?? null;
  if (!activeMembership) throw Errors.forbidden("Anda tidak punya akses tenant ini.");

  const tenantStatus = activeMembership.tenant.status;
  const tenantTrialEndsAt = activeMembership.tenant.trialEndsAt ?? null;

  const permissions = await resolvePermissionCache({
    tenantId: activeTenantId,
    userId: user.id,
    fallback: (activeMembership.role?.permissions ?? []).map((rp) => rp.permission.key),
  });
  const roleName = activeMembership.role?.name ?? null;

  const activeBranch =
    (activeMembership.branchId ? { id: activeMembership.branchId, name: activeMembership.branch?.name ?? null } : null) ??
    (await resolveOrCreateActiveBranch({ tenantId: activeTenantId }));

  // Ensure membership has a branchId (legacy/self-heal).
  if (!activeMembership.branchId && activeBranch?.id) {
    await prisma.tenantUser
      .update({
        where: { tenantId_userId: { tenantId: activeTenantId, userId: user.id } },
        data: { branchId: activeBranch.id },
        select: { id: true },
      })
      .catch(() => {});
  }

  const ctx = {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    userImage: user.image,
    isSuperAdmin: false,
    tenantId: activeTenantId,
    tenantName: activeMembership.tenant.name,
    tenantSlug: activeMembership.tenant.slug,
    tenantStatus,
    tenantTrialEndsAt,
    branchId: activeBranch.id,
    branchName: activeBranch.name ?? null,
    permissions,
    roleName,
    memberships,
  };
  await setCache(cacheKeys.tenantContext(activeTenantId, user.id), cacheContext(ctx), 60);
  return ctx;
});
