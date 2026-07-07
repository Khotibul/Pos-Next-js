"use server";

import { ActionResult, actionFail, actionOk } from "@/shared/server/errors/result";
import { isAppError } from "@/shared/server/errors/app-error";
import { PERMISSIONS } from "@/shared/constants/permissions";
import { requirePermission } from "@/shared/server/auth/permissions";
import { writeAuditLog } from "@/shared/server/audit/index";
import { writeErrorLog } from "@/shared/server/monitoring/log-service";
import { upsertPurchaseOrderSchema } from "@/modules/purchases/validators";
import { deletePurchaseOrder, upsertPurchaseOrder } from "@/features/purchases/data/service";

function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) obj[k] = v;
  return obj;
}

export async function upsertPurchaseOrderAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission(PERMISSIONS.inventory_write);
    const parsed = upsertPurchaseOrderSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return actionFail("Validasi gagal.");

    const res = await upsertPurchaseOrder({ tenantId: ctx.tenantId, input: parsed.data });
    void writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: parsed.data.id ? "UPDATE" : "CREATE",
      entity: "PurchaseOrder",
      entityId: res.id,
      metadata: { status: parsed.data.status, supplierId: parsed.data.supplierId || null },
    });

    return actionOk({ id: res.id });
  } catch (err) {
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:purchases", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Terjadi kesalahan saat menyimpan PO.");
  }
}

export async function deletePurchaseOrderAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission(PERMISSIONS.inventory_delete);
    if (!id) return actionFail("ID tidak valid.");
    const res = await deletePurchaseOrder({ tenantId: ctx.tenantId, id });
    void writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "DELETE", entity: "PurchaseOrder", entityId: id });
    return actionOk({ id: res.id });
  } catch (err) {
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:purchases", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Terjadi kesalahan saat menghapus PO.");
  }
}
