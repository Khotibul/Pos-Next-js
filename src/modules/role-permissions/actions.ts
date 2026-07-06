"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, fieldErrorsFromZod } from "@/lib/action";
import { isAppError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { writeErrorLog } from "@/lib/monitoring/log-service";
import { updateRolePermissionsSchema } from "@/modules/role-permissions/validators";
import { updateRolePermissions } from "@/modules/role-permissions/service";

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
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };

    const res = await updateRolePermissions({ tenantId: ctx.tenantId, input: parsed.data });
    void writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "UPDATE",
      entity: "RolePermission",
      entityId: parsed.data.roleId,
      metadata: { permissionCount: parsed.data.permissionIds.length },
    });
    revalidatePath("/settings/roles");
    return { ok: true, data: res };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    await writeErrorLog({ source: "module:role-permissions", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return { ok: false, message: "Terjadi kesalahan saat menyimpan permission role." };
  }
}

