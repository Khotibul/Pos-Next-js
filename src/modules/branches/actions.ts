"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, fieldErrorsFromZod } from "@/lib/action";
import { Errors, isAppError } from "@/lib/errors";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { requireActiveTenant } from "@/lib/tenant-guards";
import { writeAuditLog } from "@/lib/audit";
import { upsertBranchSchema } from "@/modules/branches/validators";
import { deleteBranch, upsertBranch } from "@/modules/branches/service";

function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) obj[k] = v;
  return obj;
}

export async function upsertBranchAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.branches_write);
    const ctx = await requireActiveTenant();

    const parsed = upsertBranchSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };

    const isUpdate = Boolean(parsed.data.id);
    const res = await upsertBranch({ tenantId: ctx.tenantId, input: parsed.data });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: isUpdate ? "UPDATE" : "CREATE",
      entity: "Branch",
      entityId: res.id,
    });

    revalidatePath("/branches");
    return { ok: true, data: res };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menyimpan cabang." };
  }
}

export async function deleteBranchAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.branches_delete);
    const ctx = await requireActiveTenant();

    if (!id) throw Errors.badRequest("ID cabang tidak valid.");
    await deleteBranch({ tenantId: ctx.tenantId, id });

    await writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "DELETE", entity: "Branch", entityId: id });

    revalidatePath("/branches");
    return { ok: true, data: { id } };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menghapus cabang." };
  }
}

