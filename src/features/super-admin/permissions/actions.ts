"use server";

import { revalidatePath } from "next/cache";
import { ActionResult } from "@/lib/action";
import { writeAuditLog } from "@/shared/server/audit";
import { isAppError } from "@/shared/server/errors/app-error";
import { requireSuperAdmin } from "@/lib/super-admin";
import { writeErrorLog } from "@/shared/server/monitoring/log-service";
import { updatePermissionMatrix } from "@/features/super-admin/permissions/data/service";

export async function updatePermissionMatrixAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireSuperAdmin();
    const roleIds = formData.getAll("roleId").filter((value): value is string => typeof value === "string");
    const grants = new Map<string, Set<string>>();
    for (const roleId of roleIds) {
      const permissionIds = formData.getAll(`grant:${roleId}`).filter((value): value is string => typeof value === "string");
      grants.set(roleId, new Set(permissionIds));
    }
    const result = await updatePermissionMatrix(grants);
    void writeAuditLog({ userId: actor.id, action: "UPDATE_PERMISSION_MATRIX", entity: "RolePermission", entityId: result.id, metadata: { roleCount: roleIds.length } });
    revalidatePath("/super-admin/permissions");
    revalidatePath("/super-admin/roles");
    return { ok: true, data: result };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    await writeErrorLog({ source: "module:super-admin-permissions", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return { ok: false, message: "Gagal menyimpan permission matrix." };
  }
}
