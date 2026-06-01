import "server-only";

import { getTenantContext } from "@/lib/tenant-context";
import { Errors } from "@/lib/errors";
import type { PermissionKey } from "@/lib/permissions-keys";
import { invalidatePermissionCache } from "@/lib/cache";
import { ensureDefaultRolePermission } from "@/modules/rbac/ensure-default-role-permission";

const SHIFT_SELF_SERVICE_PERMISSIONS = new Set<PermissionKey>([
  "transactions.shift.read",
  "transactions.shift.open",
  "transactions.shift.close",
]);

export async function requirePermission(required: PermissionKey) {
  const ctx = await getTenantContext();
  if (ctx.isSuperAdmin) return ctx;
  if (SHIFT_SELF_SERVICE_PERMISSIONS.has(required)) {
    const merged = new Set([...ctx.permissions, ...SHIFT_SELF_SERVICE_PERMISSIONS]);
    return { ...ctx, permissions: [...merged] };
  }
  if (!ctx.permissions.includes(required)) {
    const repaired = await ensureDefaultRolePermission({
      tenantId: ctx.tenantId,
      roleName: ctx.roleName,
      permissionKey: required,
    });
    if (repaired) {
      await invalidatePermissionCache(ctx.tenantId, ctx.userId);
      return { ...ctx, permissions: [...ctx.permissions, required] };
    }
    throw Errors.forbidden("Anda tidak punya izin untuk aksi ini.");
  }
  return ctx;
}
