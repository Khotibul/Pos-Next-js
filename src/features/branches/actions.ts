"use server";

import { ActionResult, actionFail, actionOk } from "@/shared/server/errors/result";
import { isAppError } from "@/shared/server/errors/app-error";
import { PERMISSIONS } from "@/shared/constants/permissions";
import { requirePermission } from "@/shared/server/auth/permissions";
import { requireActiveTenant } from "@/lib/tenant-guards";
import { writeAuditLog } from "@/shared/server/audit/index";
import { writeErrorLog } from "@/shared/server/monitoring/log-service";
import { upsertBranchSchema } from "@/features/branches/validators";
import { upsertBranch, deleteBranch } from "@/features/branches/data/service";

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
    if (!parsed.success) return actionFail("Validasi gagal.");

    const isUpdate = Boolean(parsed.data.id);
    const res = await upsertBranch({ tenantId: ctx.tenantId, input: parsed.data });
    void writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: isUpdate ? "UPDATE" : "CREATE", entity: "Branch", entityId: res.id });
    return actionOk({ id: res.id });
  } catch (err) {
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:branches", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Terjadi kesalahan saat menyimpan cabang.");
  }
}

export async function deleteBranchAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.branches_delete);
    const ctx = await requireActiveTenant();
    await deleteBranch({ tenantId: ctx.tenantId, id });
    void writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "DELETE", entity: "Branch", entityId: id });
    return actionOk({ id });
  } catch (err) {
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:branches", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Terjadi kesalahan saat menghapus cabang.");
  }
}
