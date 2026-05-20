"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, fieldErrorsFromZod } from "@/lib/action";
import { Errors, isAppError } from "@/lib/errors";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { requireActiveTenant } from "@/lib/tenant-guards";
import { writeAuditLog } from "@/lib/audit";
import { upsertBranchCategorySchema } from "@/modules/branch-categories/validators";
import { deleteBranchCategory, upsertBranchCategory } from "@/modules/branch-categories/service";

function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) obj[k] = v;
  return obj;
}

export async function upsertBranchCategoryAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.branches_write);
    const ctx = await requireActiveTenant();

    const parsed = upsertBranchCategorySchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };

    const isUpdate = Boolean(parsed.data.id);
    const res = await upsertBranchCategory({ tenantId: ctx.tenantId, input: parsed.data });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: isUpdate ? "UPDATE" : "CREATE",
      entity: "BranchCategory",
      entityId: res.id,
    });

    revalidatePath("/branches/categories");
    revalidatePath("/branches");
    return { ok: true, data: res };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menyimpan kategori cabang." };
  }
}

export async function deleteBranchCategoryAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.branches_delete);
    const ctx = await requireActiveTenant();

    if (!id) throw Errors.badRequest("ID kategori tidak valid.");
    await deleteBranchCategory({ tenantId: ctx.tenantId, id });

    await writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "DELETE", entity: "BranchCategory", entityId: id });

    revalidatePath("/branches/categories");
    revalidatePath("/branches");
    return { ok: true, data: { id } };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menghapus kategori cabang." };
  }
}

