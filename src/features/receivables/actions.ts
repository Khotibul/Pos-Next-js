"use server";
import { revalidatePath } from "next/cache";
import { ActionResult, actionFail, actionOk } from "@/shared/server/errors/result";
import { isAppError } from "@/shared/server/errors/app-error";
import { PERMISSIONS } from "@/shared/constants/permissions";
import { requirePermission } from "@/shared/server/auth/permissions";
import { requireActiveTenant } from "@/lib/tenant-guards";
import { writeAuditLog } from "@/shared/server/audit/index";
import { writeErrorLog } from "@/shared/server/monitoring/log-service";
import { upsertReceivableSchema, createReceivablePaymentSchema } from "@/features/receivables/validators";
import { upsertReceivable, deleteReceivable, createReceivablePayment, deleteReceivablePayment } from "@/features/receivables/data/service";

function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) obj[k] = v;
  return obj;
}

export async function upsertReceivableAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.receivables_write);
    const ctx = await requireActiveTenant();
    const parsed = upsertReceivableSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return actionFail("Validasi gagal: " + parsed.error.errors.map((e) => e.message).join(", "));
    const isUpdate = Boolean(parsed.data.id);
    const res = await upsertReceivable({ tenantId: ctx.tenantId, input: parsed.data });
    void writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: isUpdate ? "UPDATE" : "CREATE", entity: "Receivable", entityId: res.id });
    revalidatePath("/receivables");
    return actionOk({ id: res.id });
  } catch (err) {
    console.error("[action:receivables]", err);
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:receivables", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Terjadi kesalahan saat menyimpan piutang.");
  }
}

export async function deleteReceivableAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.receivables_delete);
    const ctx = await requireActiveTenant();
    await deleteReceivable({ tenantId: ctx.tenantId, id });
    void writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "DELETE", entity: "Receivable", entityId: id });
    revalidatePath("/receivables");
    return actionOk({ id });
  } catch (err) {
    console.error("[action:receivables]", err);
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:receivables", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Terjadi kesalahan saat menghapus piutang.");
  }
}

export async function createReceivablePaymentAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.receivables_write);
    const ctx = await requireActiveTenant();
    const parsed = createReceivablePaymentSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return actionFail("Validasi gagal: " + parsed.error.errors.map((e) => e.message).join(", "));
    const res = await createReceivablePayment({ tenantId: ctx.tenantId, input: parsed.data });
    void writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "CREATE", entity: "ReceivablePayment", entityId: res.id });
    revalidatePath("/receivables");
    revalidatePath(`/receivables/${parsed.data.receivableId}`);
    return actionOk({ id: res.id });
  } catch (err) {
    console.error("[action:receivables]", err);
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:receivables", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Terjadi kesalahan saat menyimpan pembayaran.");
  }
}

export async function deleteReceivablePaymentAction(paymentId: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.receivables_write);
    const ctx = await requireActiveTenant();
    await deleteReceivablePayment({ tenantId: ctx.tenantId, paymentId });
    void writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "DELETE", entity: "ReceivablePayment", entityId: paymentId });
    revalidatePath("/receivables");
    return actionOk({ id: paymentId });
  } catch (err) {
    console.error("[action:receivables]", err);
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:receivables", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Terjadi kesalahan saat menghapus pembayaran.");
  }
}
