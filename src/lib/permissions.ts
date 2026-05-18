import "server-only";

import { getTenantContext } from "@/lib/tenant-context";
import { Errors } from "@/lib/errors";
import type { PermissionKey } from "@/lib/permissions-keys";

export async function requirePermission(required: PermissionKey) {
  const ctx = await getTenantContext();
  if (ctx.isSuperAdmin) return ctx;
  if (!ctx.permissions.includes(required)) throw Errors.forbidden("Anda tidak punya izin untuk aksi ini.");
  return ctx;
}
