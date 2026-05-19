"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, fieldErrorsFromZod } from "@/lib/action";
import { isAppError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { upsertPurchaseOrderSchema } from "@/modules/purchases/validators";
import { deletePurchaseOrder, upsertPurchaseOrder } from "@/modules/purchases/service";

function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) obj[k] = v;
  return obj;
}

export async function upsertPurchaseOrderAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission(PERMISSIONS.inventory_write);
    const parsed = upsertPurchaseOrderSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };

    const res = await upsertPurchaseOrder({ tenantId: ctx.tenantId, input: parsed.data });
    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: parsed.data.id ? "UPDATE" : "CREATE",
      entity: "PurchaseOrder",
      entityId: res.id,
      metadata: { status: parsed.data.status, supplierId: parsed.data.supplierId || null },
    });

    revalidatePath("/purchases");
    return { ok: true, data: res };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menyimpan PO." };
  }
}

export async function deletePurchaseOrderAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission(PERMISSIONS.inventory_delete);
    if (!id) return { ok: false, message: "ID tidak valid." };
    const res = await deletePurchaseOrder({ tenantId: ctx.tenantId, id });
    await writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "DELETE", entity: "PurchaseOrder", entityId: id });
    revalidatePath("/purchases");
    return { ok: true, data: res };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menghapus PO." };
  }
}

