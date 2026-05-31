import "server-only";

import { Errors } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { requireTenantAccess, tenantAccessIsTrialExpired } from "@/lib/guards/require-tenant-access";

export async function requireCanTransact(params: { tenantId: string; userId: string }) {
  const access = await requireTenantAccess(params);

  if (tenantAccessIsTrialExpired(access)) {
    await prisma.tenant.update({ where: { id: params.tenantId }, data: { status: "EXPIRED" } }).catch(() => {});
    throw Errors.forbidden("Masa trial sudah berakhir. Silakan akses billing untuk aktivasi.");
  }

  if (access.status === "SUSPENDED") throw Errors.forbidden("Tenant Anda sedang suspended. Silakan akses billing.");
  if (access.status === "EXPIRED") throw Errors.forbidden("Langganan expired. Silakan perpanjang di billing.");

  return access;
}
