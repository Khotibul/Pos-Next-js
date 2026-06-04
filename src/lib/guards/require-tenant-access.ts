import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Errors } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  getCachedTenantAccess,
  getCachedTenantMembership,
  getCachedTenantStatus,
  setCachedTenantAccess,
  setCachedTenantMembership,
  setCachedTenantStatus,
  type CachedTenantAccess,
  type CachedTenantStatus,
} from "@/lib/cache/tenant-cache";

type TenantAccessParams = {
  tenantId?: string;
  userId?: string;
  isSuperAdmin?: boolean;
};

function isTrialExpired(status: CachedTenantStatus) {
  return status.status === "TRIAL" && status.trialEndsAt !== null && new Date(status.trialEndsAt).getTime() < Date.now();
}

async function resolveIds(params?: TenantAccessParams) {
  const session = params?.userId ? null : await auth();
  const userId = params?.userId ?? session?.user?.id ?? null;
  if (!userId) redirect("/login");

  const cookieStore = params?.tenantId ? null : await cookies();
  const tenantId = params?.tenantId ?? cookieStore?.get("active_tenant_id")?.value ?? null;
  if (!tenantId) throw Errors.forbidden("Tenant tidak ditemukan.");

  return { tenantId, userId };
}

export async function requireTenantAccess(params?: TenantAccessParams): Promise<CachedTenantAccess> {
  const { tenantId, userId } = await resolveIds(params);
  const cachedAccess = await getCachedTenantAccess(tenantId, userId);
  if (cachedAccess) {
    return params?.isSuperAdmin === undefined ? cachedAccess : { ...cachedAccess, isSuperAdmin: params.isSuperAdmin };
  }

  let status = await getCachedTenantStatus(tenantId);
  let membership = await getCachedTenantMembership(tenantId, userId);

  if (!status || !membership) {
    const [tenant, user, tenantUser] = await Promise.all([
      status
        ? Promise.resolve(null)
        : prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { status: true, trialEndsAt: true },
          }),
      params?.isSuperAdmin === undefined
        ? prisma.user.findUnique({
            where: { id: userId },
            select: { isSuperAdmin: true },
          })
        : Promise.resolve({ isSuperAdmin: params.isSuperAdmin }),
      membership
        ? Promise.resolve(null)
        : prisma.tenantUser.findUnique({
            where: { tenantId_userId: { tenantId, userId } },
            select: { branchId: true, role: { select: { name: true } } },
          }),
    ]);

    if (!status) {
      if (!tenant) throw Errors.forbidden("Tenant tidak ditemukan.");
      status = {
        status: tenant.status,
        trialEndsAt: tenant.trialEndsAt?.toISOString() ?? null,
      };
      await setCachedTenantStatus(tenantId, status);
    }

    if (!membership) {
      membership = {
        exists: Boolean(tenantUser),
        branchId: tenantUser?.branchId ?? null,
        roleName: tenantUser?.role?.name ?? null,
      };
      await setCachedTenantMembership(tenantId, userId, membership);
    }

    const access = {
      ...status,
      isSuperAdmin: Boolean(user?.isSuperAdmin),
      membership,
    };

    if (!access.isSuperAdmin && !access.membership.exists) throw Errors.forbidden("Anda tidak punya akses tenant ini.");
    await setCachedTenantAccess(tenantId, userId, access);
    return access;
  }

  const user =
    params?.isSuperAdmin === undefined
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { isSuperAdmin: true },
        })
      : { isSuperAdmin: params.isSuperAdmin };

  const access = { ...status, isSuperAdmin: Boolean(user?.isSuperAdmin), membership };
  if (!access.isSuperAdmin && !access.membership.exists) throw Errors.forbidden("Anda tidak punya akses tenant ini.");
  await setCachedTenantAccess(tenantId, userId, access);
  return access;
}

export function assertTenantCanAccessApp(access: CachedTenantAccess) {
  if (isTrialExpired(access)) throw Errors.forbidden("Masa trial sudah berakhir. Silakan akses billing untuk aktivasi.");
  return true;
}

export function tenantAccessIsTrialExpired(access: CachedTenantAccess) {
  return isTrialExpired(access);
}
