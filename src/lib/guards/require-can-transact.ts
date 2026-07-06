import "server-only";

import { Errors } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { requireTenantAccess } from "@/lib/guards/require-tenant-access";

export async function requireCanTransact(params: { tenantId: string; userId: string; status?: string; trialEndsAt?: string | null }) {
  const access = params.status !== undefined
    ? { status: params.status, trialEndsAt: params.trialEndsAt ?? null }
    : await requireTenantAccess(params);

  if (access.status === "TRIAL" && access.trialEndsAt && new Date(access.trialEndsAt).getTime() < Date.now()) {
    await prisma.tenant.update({ where: { id: params.tenantId }, data: { status: "EXPIRED" } }).catch(() => {});
    throw Errors.forbidden("Masa trial sudah berakhir. Silakan akses billing untuk aktivasi.");
  }

  if (access.status === "SUSPENDED") throw Errors.forbidden("Tenant Anda sedang suspended. Silakan akses billing.");
  if (access.status === "EXPIRED") throw Errors.forbidden("Langganan expired. Silakan perpanjang di billing.");

  return access;
}
