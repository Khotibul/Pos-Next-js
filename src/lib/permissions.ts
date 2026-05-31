import "server-only";

import { getTenantContext } from "@/lib/tenant-context";
import { Errors } from "@/lib/errors";
import type { PermissionKey } from "@/lib/permissions-keys";
import { invalidatePermissionCache } from "@/lib/cache";
import { ensureDefaultRolePermission } from "@/modules/rbac/ensure-default-role-permission";

export async function requirePermission(required: PermissionKey) {
  const ctx = await getTenantContext();
  if (ctx.isSuperAdmin) return ctx;
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
