"use server";
import { revalidatePath } from "next/cache";
import { ActionResult, actionFail, actionOk } from "@/shared/server/errors/result";
import { isAppError } from "@/shared/server/errors/app-error";
import { PERMISSIONS } from "@/shared/constants/permissions";
import { requirePermission } from "@/shared/server/auth/permissions";
import { requireActiveTenant } from "@/lib/tenant-guards";
import { writeAuditLog } from "@/shared/server/audit/index";
import { writeErrorLog } from "@/shared/server/monitoring/log-service";
import { upsertPayableSchema, createPayablePaymentSchema } from "@/features/payables/validators";
import { upsertPayable, deletePayable, createPayablePayment, deletePayablePayment } from "@/features/payables/data/service";

function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) obj[k] = v;
  return obj;
}

export async function upsertPayableAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.payables_write);
    const ctx = await requireActiveTenant();
    const parsed = upsertPayableSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return actionFail("Validasi gagal: " + parsed.error.errors.map((e) => e.message).join(", "));
    const isUpdate = Boolean(parsed.data.id);
    const res = await upsertPayable({ tenantId: ctx.tenantId, input: parsed.data });
    void writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: isUpdate ? "UPDATE" : "CREATE", entity: "Payable", entityId: res.id });
    revalidatePath("/payables");
    return actionOk({ id: res.id });
  } catch (err) {
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:payables", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Terjadi kesalahan saat menyimpan utang.");
  }
}

export async function deletePayableAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.payables_delete);
    const ctx = await requireActiveTenant();
    await deletePayable({ tenantId: ctx.tenantId, id });
    void writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "DELETE", entity: "Payable", entityId: id });
    revalidatePath("/payables");
    return actionOk({ id });
  } catch (err) {
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:payables", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Terjadi kesalahan saat menghapus utang.");
  }
}

export async function createPayablePaymentAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.payables_write);
    const ctx = await requireActiveTenant();
    const parsed = createPayablePaymentSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return actionFail("Validasi gagal: " + parsed.error.errors.map((e) => e.message).join(", "));
    const res = await createPayablePayment({ tenantId: ctx.tenantId, input: parsed.data });
    void writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "CREATE", entity: "PayablePayment", entityId: res.id });
    revalidatePath("/payables");
    revalidatePath(`/payables/${parsed.data.payableId}`);
    return actionOk({ id: res.id });
  } catch (err) {
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:payables", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Terjadi kesalahan saat menyimpan pembayaran.");
  }
}

export async function deletePayablePaymentAction(paymentId: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.payables_write);
    const ctx = await requireActiveTenant();
    await deletePayablePayment({ tenantId: ctx.tenantId, paymentId });
    void writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "DELETE", entity: "PayablePayment", entityId: paymentId });
    revalidatePath("/payables");
    return actionOk({ id: paymentId });
  } catch (err) {
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:payables", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Terjadi kesalahan saat menghapus pembayaran.");
  }
}
