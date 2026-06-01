"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, fieldErrorsFromZod } from "@/lib/action";
import { writeAuditLog } from "@/lib/audit";
import { isAppError } from "@/lib/errors";
import { requireSuperAdmin } from "@/lib/super-admin";
import { formDataToRecord } from "@/modules/super-admin/shared";
import { cloneRoleSchema, createRoleSchema, deleteRoleSchema } from "@/modules/super-admin/roles/validators";
import { cloneSuperAdminRole, createSuperAdminRole, deleteSuperAdminRole } from "@/modules/super-admin/roles/service";

function toError(err: unknown, fallback: string): ActionResult<{ id: string }> {
  if (isAppError(err)) return { ok: false, message: err.message };
  return { ok: false, message: fallback };
}

export async function createRoleAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireSuperAdmin();
    const parsed = createRoleSchema.safeParse(formDataToRecord(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };
    const role = await createSuperAdminRole(parsed.data);
    await writeAuditLog({ tenantId: role.tenantId, userId: actor.id, action: "CREATE", entity: "Role", entityId: role.id, metadata: { name: parsed.data.name } });
    revalidatePath("/super-admin/roles");
    revalidatePath("/super-admin/permissions");
    return { ok: true, data: { id: role.id } };
  } catch (err) {
    return toError(err, "Gagal membuat role.");
  }
}

export async function cloneRoleAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireSuperAdmin();
    const parsed = cloneRoleSchema.safeParse(formDataToRecord(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };
    const role = await cloneSuperAdminRole(parsed.data);
    await writeAuditLog({ tenantId: role.tenantId, userId: actor.id, action: "CLONE", entity: "Role", entityId: role.id, metadata: { sourceRoleId: parsed.data.roleId } });
    revalidatePath("/super-admin/roles");
    revalidatePath("/super-admin/permissions");
    return { ok: true, data: { id: role.id } };
  } catch (err) {
    return toError(err, "Gagal clone role.");
  }
}

export async function deleteRoleAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireSuperAdmin();
    const parsed = deleteRoleSchema.safeParse(formDataToRecord(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };
    const result = await deleteSuperAdminRole(parsed.data.roleId);
    await writeAuditLog({ userId: actor.id, action: "DELETE", entity: "Role", entityId: result.id });
    revalidatePath("/super-admin/roles");
    revalidatePath("/super-admin/permissions");
    return { ok: true, data: result };
  } catch (err) {
    return toError(err, "Gagal hapus role.");
  }
}
