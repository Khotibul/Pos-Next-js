"use server";

import { ActionResult, actionFail, actionOk } from "@/shared/server/errors/result";
import { isAppError } from "@/shared/server/errors/app-error";
import { PERMISSIONS } from "@/shared/constants/permissions";
import { requirePermission } from "@/shared/server/auth/permissions";
import { writeAuditLog } from "@/shared/server/audit/index";
import { writeErrorLog } from "@/shared/server/monitoring/log-service";
import { updateRolePermissionsSchema } from "@/modules/role-permissions/validators";
import { updateRolePermissions } from "@/features/role-permissions/data/service";

function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    if (k === "permissionIds") {
      if (!obj.permissionIds) obj.permissionIds = [];
      (obj.permissionIds as unknown[]).push(v);
    } else {
      obj[k] = v;
    }
  }
  return obj;
}

export async function updateRolePermissionsAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission(PERMISSIONS.settings_write);
    const parsed = updateRolePermissionsSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return actionFail("Validasi gagal.");

    const res = await updateRolePermissions({ tenantId: ctx.tenantId, input: parsed.data });
    void writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "UPDATE", entity: "RolePermission", entityId: parsed.data.roleId, metadata: { permissionCount: parsed.data.permissionIds.length } });
    return actionOk({ id: res.id });
  } catch (err) {
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:role-permissions", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Terjadi kesalahan saat menyimpan permission role.");
  }
}
