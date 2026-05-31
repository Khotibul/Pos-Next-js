import "server-only";

import { getTenantContext } from "@/lib/tenant-context";
import { requireCanTransact } from "@/lib/guards/require-can-transact";

export async function requireTenant() {
  return getTenantContext();
}

export async function requireActiveTenant() {
  const ctx = await getTenantContext();
  await requireCanTransact({ tenantId: ctx.tenantId, userId: ctx.userId });
  return ctx;
}
