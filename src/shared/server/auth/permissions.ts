import "server-only";

import { getTenantContext } from "@/lib/tenant-context";
import { Errors } from "@/shared/server/errors/app-error";
import type { PermissionKey } from "@/shared/constants/permissions";

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
    const { ensureDefaultRolePermission } = await import("@/modules/rbac/ensure-default-role-permission");
    const repaired = await ensureDefaultRolePermission({
      tenantId: ctx.tenantId,
      roleName: ctx.roleName,
      permissionKey: required,
    });
    if (repaired) {
      const { invalidatePermissionCache } = await import("@/shared/server/cache");
      await invalidatePermissionCache(ctx.tenantId, ctx.userId);
      return { ...ctx, permissions: [...ctx.permissions, required] };
    }
    throw Errors.forbidden("Anda tidak punya izin untuk aksi ini.");
  }
  return ctx;
}
