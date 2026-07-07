"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, fieldErrorsFromZod } from "@/lib/action";
import { writeAuditLog } from "@/shared/server/audit";
import { isAppError } from "@/shared/server/errors/app-error";
import { requireSuperAdmin } from "@/lib/super-admin";
import { writeErrorLog } from "@/shared/server/monitoring/log-service";
import { formDataToRecord } from "@/features/super-admin/shared";
import { cloneRoleSchema, createRoleSchema, deleteRoleSchema } from "@/features/super-admin/roles/validators";
import { cloneSuperAdminRole, createSuperAdminRole, deleteSuperAdminRole } from "@/features/super-admin/roles/data/service";

async function toError(err: unknown, fallback: string): Promise<ActionResult<{ id: string }>> {
  if (isAppError(err)) return { ok: false, message: err.message };
  await writeErrorLog({ source: "module:super-admin-roles", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
  return { ok: false, message: fallback };
}

export async function createRoleAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireSuperAdmin();
    const parsed = createRoleSchema.safeParse(formDataToRecord(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };
    const role = await createSuperAdminRole(parsed.data);
    void writeAuditLog({ tenantId: role.tenantId, userId: actor.id, action: "CREATE", entity: "Role", entityId: role.id, metadata: { name: parsed.data.name } });
    revalidatePath("/super-admin/roles");
    revalidatePath("/super-admin/permissions");
    return { ok: true, data: { id: role.id } };
  } catch (err) {
    return await toError(err, "Gagal membuat role.");
  }
}

export async function cloneRoleAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireSuperAdmin();
    const parsed = cloneRoleSchema.safeParse(formDataToRecord(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };
    const role = await cloneSuperAdminRole(parsed.data);
    void writeAuditLog({ tenantId: role.tenantId, userId: actor.id, action: "CLONE", entity: "Role", entityId: role.id, metadata: { sourceRoleId: parsed.data.roleId } });
    revalidatePath("/super-admin/roles");
    revalidatePath("/super-admin/permissions");
    return { ok: true, data: { id: role.id } };
  } catch (err) {
    return await toError(err, "Gagal clone role.");
  }
}

export async function deleteRoleAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireSuperAdmin();
    const parsed = deleteRoleSchema.safeParse(formDataToRecord(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };
    const result = await deleteSuperAdminRole(parsed.data.roleId);
    void writeAuditLog({ userId: actor.id, action: "DELETE", entity: "Role", entityId: result.id });
    revalidatePath("/super-admin/roles");
    revalidatePath("/super-admin/permissions");
    return { ok: true, data: result };
  } catch (err) {
    return await toError(err, "Gagal hapus role.");
  }
}
