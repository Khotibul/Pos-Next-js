"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, fieldErrorsFromZod } from "@/lib/action";
import { isAppError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { approveShiftSchema, closeShiftSchema, openShiftSchema } from "@/modules/shifts/validators";
import { approveShift, closeShift, openShift } from "@/modules/shifts/service";

function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) obj[k] = v;
  return obj;
}

export async function openShiftAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission(PERMISSIONS.transactions_shift_open);
    const parsed = openShiftSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };

    const res = await openShift({ tenantId: ctx.tenantId, branchId: ctx.branchId, cashierId: ctx.userId, input: parsed.data });
    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "OPEN",
      entity: "CashierShift",
      entityId: res.id,
      metadata: { openingCash: parsed.data.openingCash },
    });
    revalidatePath("/shifts");
    revalidatePath("/pos");
    return { ok: true, data: res };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat buka shift." };
  }
}

export async function closeShiftAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission(PERMISSIONS.transactions_shift_close);
    const parsed = closeShiftSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };

    const res = await closeShift({ tenantId: ctx.tenantId, cashierId: ctx.userId, input: parsed.data });
    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "CLOSE",
      entity: "CashierShift",
      entityId: res.id,
      metadata: { cashCounted: parsed.data.cashCounted },
    });
    revalidatePath("/shifts");
    revalidatePath("/pos");
    return { ok: true, data: res };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat tutup shift." };
  }
}

export async function approveShiftAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission(PERMISSIONS.transactions_shift_approve);
    const parsed = approveShiftSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };

    const res = await approveShift({ tenantId: ctx.tenantId, approvedById: ctx.userId, input: parsed.data });
    await writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "APPROVE", entity: "CashierShift", entityId: res.id });
    revalidatePath("/shifts");
    revalidatePath(`/shifts/${res.id}`);
    return { ok: true, data: res };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat approve shift." };
  }
}
