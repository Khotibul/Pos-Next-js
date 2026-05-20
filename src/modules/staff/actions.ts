"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, fieldErrorsFromZod } from "@/lib/action";
import { Errors, isAppError } from "@/lib/errors";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { requireActiveTenant } from "@/lib/tenant-guards";
import { writeAuditLog } from "@/lib/audit";
import { upsertStaffSchema } from "@/modules/staff/validators";
import { deleteStaff, upsertStaff } from "@/modules/staff/service";

function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) obj[k] = v;
  return obj;
}

export async function upsertStaffAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.staff_write);
    const ctx = await requireActiveTenant();

    const parsed = upsertStaffSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };

    const isUpdate = Boolean(parsed.data.id);
    const res = await upsertStaff({ tenantId: ctx.tenantId, input: parsed.data });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: isUpdate ? "UPDATE" : "CREATE",
      entity: "TenantUser",
      entityId: res.id,
    });

    revalidatePath("/settings/staff");
    return { ok: true, data: res };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menyimpan pegawai." };
  }
}

export async function deleteStaffAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.staff_delete);
    const ctx = await requireActiveTenant();

    if (!id) throw Errors.badRequest("ID tidak valid.");
    await deleteStaff({ tenantId: ctx.tenantId, id });

    await writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "DELETE", entity: "TenantUser", entityId: id });

    revalidatePath("/settings/staff");
    return { ok: true, data: { id } };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menghapus pegawai." };
  }
}

