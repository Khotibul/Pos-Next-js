"use server";

import { ActionResult, actionFail, actionOk } from "@/shared/server/errors/result";
import { isAppError } from "@/shared/server/errors/app-error";
import { PERMISSIONS } from "@/shared/constants/permissions";
import { requirePermission } from "@/shared/server/auth/permissions";
import { writeAuditLog } from "@/shared/server/audit/index";
import { writeErrorLog } from "@/shared/server/monitoring/log-service";
import { openShiftSchema, closeShiftSchema, approveShiftSchema } from "@/features/shifts/validators";
import { openShift, closeShift, approveShift } from "@/features/shifts/data/service";

export type PermissionContext = {
  tenantId: string;
  userId: string;
  branchId: string;
  isSuperAdmin: boolean;
  roleName?: string;
};

function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) obj[k] = v;
  return obj;
}

export async function openShiftAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission(PERMISSIONS.transactions_shift_open) as unknown as PermissionContext;
    const parsed = openShiftSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return actionFail("Validasi gagal.");

    const res = await openShift({ tenantId: ctx.tenantId, branchId: ctx.branchId, cashierId: ctx.userId, input: parsed.data });
    void writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "OPEN", entity: "CashierShift", entityId: res.id, metadata: { openingCash: parsed.data.openingCash } });
    return actionOk({ id: res.id });
  } catch (err) {
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:shifts", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Terjadi kesalahan saat buka shift.");
  }
}

export async function closeShiftAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission(PERMISSIONS.transactions_shift_close) as unknown as PermissionContext;
    const parsed = closeShiftSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return actionFail("Validasi gagal.");

    const canCloseAnyCashier = ctx.isSuperAdmin || ["OWNER", "ADMIN", "BRANCH_MANAGER"].includes(ctx.roleName ?? "");
    const res = await closeShift({ tenantId: ctx.tenantId, cashierId: ctx.userId, input: parsed.data, allowAnyCashier: canCloseAnyCashier });
    void writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "CLOSE", entity: "CashierShift", entityId: res.id, metadata: { cashCounted: parsed.data.cashCounted } });
    return actionOk({ id: res.id });
  } catch (err) {
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:shifts", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Terjadi kesalahan saat tutup shift.");
  }
}

export async function approveShiftAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission(PERMISSIONS.transactions_shift_approve) as unknown as PermissionContext;
    const parsed = approveShiftSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return actionFail("Validasi gagal.");

    const res = await approveShift({ tenantId: ctx.tenantId, approvedById: ctx.userId, input: parsed.data });
    void writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "APPROVE", entity: "CashierShift", entityId: res.id });
    return actionOk({ id: res.id });
  } catch (err) {
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:shifts", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Terjadi kesalahan saat approve shift.");
  }
}
