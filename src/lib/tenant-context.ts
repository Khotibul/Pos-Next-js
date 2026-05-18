import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Errors } from "@/lib/errors";

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
  permissions: string[];
  roleName: string | null;
  memberships: Array<{ tenantId: string; tenantName: string; tenantSlug: string; tenantStatus: string }>;
};

export const getTenantContext = cache(async (): Promise<TenantContext> => {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      isSuperAdmin: true,
      memberships: {
        select: {
          tenantId: true,
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

  const memberships = user.memberships.map((m) => ({
    tenantId: m.tenantId,
    tenantName: m.tenant.name,
    tenantSlug: m.tenant.slug,
    tenantStatus: m.tenant.status,
  }));

  if (!user.isSuperAdmin && memberships.length === 0) {
    throw Errors.forbidden("Anda belum tergabung ke tenant manapun.");
  }

  const cookieStore = await cookies();
  const cookieTenantId = cookieStore.get("active_tenant_id")?.value ?? null;

  const activeTenantId =
    (cookieTenantId && memberships.find((m) => m.tenantId === cookieTenantId)?.tenantId) ||
    memberships[0]?.tenantId;

  if (!activeTenantId) throw Errors.forbidden("Tenant tidak ditemukan.");

  const activeMembership = user.memberships.find((m) => m.tenantId === activeTenantId) ?? null;
  if (!user.isSuperAdmin && !activeMembership) throw Errors.forbidden("Anda tidak punya akses tenant ini.");

  const activeTenantInfo =
    memberships.find((m) => m.tenantId === activeTenantId) ??
    (activeMembership
      ? {
          tenantId: activeMembership.tenantId,
          tenantName: activeMembership.tenant.name,
          tenantSlug: activeMembership.tenant.slug,
          tenantStatus: activeMembership.tenant.status,
        }
      : null);

  const tenantStatus = activeMembership?.tenant.status ?? activeTenantInfo?.tenantStatus;
  if (!tenantStatus) throw Errors.forbidden("Tenant tidak valid.");
  const tenantTrialEndsAt = activeMembership?.tenant.trialEndsAt ?? null;

  const permissions = (activeMembership?.role?.permissions ?? []).map((rp) => rp.permission.key);
  const roleName = activeMembership?.role?.name ?? null;

  return {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    userImage: user.image,
    isSuperAdmin: user.isSuperAdmin,
    tenantId: activeTenantId,
    tenantName: activeTenantInfo?.tenantName ?? activeMembership?.tenant.name ?? "Tenant",
    tenantSlug: activeTenantInfo?.tenantSlug ?? activeMembership?.tenant.slug ?? "tenant",
    tenantStatus,
    tenantTrialEndsAt,
    permissions,
    roleName,
    memberships,
  };
});
