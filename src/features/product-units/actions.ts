"use server";

import { ActionResult, actionFail, actionOk } from "@/shared/server/errors/result";
import { isAppError } from "@/shared/server/errors/app-error";
import { PERMISSIONS } from "@/shared/constants/permissions";
import { requirePermission } from "@/shared/server/auth/permissions";
import { requireActiveTenant } from "@/lib/tenant-guards";
import { writeAuditLog } from "@/shared/server/audit/index";
import { writeErrorLog } from "@/shared/server/monitoring/log-service";
import { upsertProductUnitSchema } from "@/features/product-units/validators";
import { upsertProductUnit, deleteProductUnit } from "@/features/product-units/data/service";

function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) obj[k] = v;
  return obj;
}

export async function upsertProductUnitAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.products_write);
    const ctx = await requireActiveTenant();

    const parsed = upsertProductUnitSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return actionFail("Validasi gagal.");

    const isUpdate = Boolean(parsed.data.id);
    const res = await upsertProductUnit({ tenantId: ctx.tenantId, input: parsed.data });
    void writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: isUpdate ? "UPDATE" : "CREATE", entity: "ProductUnit", entityId: res.id });
    return actionOk({ id: res.id });
  } catch (err) {
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:product-units", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Terjadi kesalahan saat menyimpan satuan.");
  }
}

export async function deleteProductUnitAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.products_delete);
    const ctx = await requireActiveTenant();
    await deleteProductUnit({ tenantId: ctx.tenantId, id });
    void writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "DELETE", entity: "ProductUnit", entityId: id });
    return actionOk({ id });
  } catch (err) {
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:product-units", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Terjadi kesalahan saat menghapus satuan.");
  }
}
