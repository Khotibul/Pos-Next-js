"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, fieldErrorsFromZod } from "@/lib/action";
import { isAppError } from "@/lib/errors";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { requireActiveTenant } from "@/lib/tenant-guards";
import { writeAuditLog } from "@/lib/audit";
import { upsertProductBatchSchema } from "@/modules/products/batches/validators";
import { deleteProductBatch, upsertProductBatch } from "@/modules/products/batches/service";

function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) obj[k] = v;
  return obj;
}

export async function upsertProductBatchAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.products_expired_update);
    const ctx = await requireActiveTenant();

    const parsed = upsertProductBatchSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };

    const isUpdate = Boolean(parsed.data.id);
    const res = await upsertProductBatch({ tenantId: ctx.tenantId, branchId: ctx.branchId, input: parsed.data });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: isUpdate ? "UPDATE" : "CREATE",
      entity: "ProductBatch",
      entityId: res.id,
    });

    revalidatePath("/products/batches");
    revalidatePath("/products/expired");
    return { ok: true, data: res };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menyimpan batch." };
  }
}

export async function deleteProductBatchAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.products_expired_update);
    const ctx = await requireActiveTenant();

    const res = await deleteProductBatch({ tenantId: ctx.tenantId, branchId: ctx.branchId, id });

    await writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "DELETE", entity: "ProductBatch", entityId: res.id });

    revalidatePath("/products/batches");
    revalidatePath("/products/expired");
    return { ok: true, data: res };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menghapus batch." };
  }
}

