import "server-only";

import { getTenantContext } from "@/lib/tenant-context";
import { Errors } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export async function requireTenant() {
  return getTenantContext();
}

export async function requireActiveTenant() {
  const ctx = await getTenantContext();
  if (ctx.tenantStatus === "TRIAL" && ctx.tenantTrialEndsAt && ctx.tenantTrialEndsAt.getTime() < Date.now()) {
    // Best-effort: mark expired so the rest of the app can react consistently.
    await prisma.tenant
      .update({ where: { id: ctx.tenantId }, data: { status: "EXPIRED" } })
      .catch(() => {});
    throw Errors.forbidden("Masa trial sudah berakhir. Silakan akses billing untuk aktivasi.");
  }
  if (ctx.tenantStatus === "SUSPENDED") throw Errors.forbidden("Tenant Anda sedang suspended. Silakan akses billing.");
  if (ctx.tenantStatus === "EXPIRED") throw Errors.forbidden("Langganan expired. Silakan perpanjang di billing.");
  return ctx;
}
