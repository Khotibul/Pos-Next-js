"use server";

import { ActionResult, actionFail, actionOk } from "@/shared/server/errors/result";
import { isAppError } from "@/shared/server/errors/app-error";
import { requireSuperAdmin } from "@/lib/super-admin";
import { writeErrorLog } from "@/shared/server/monitoring/log-service";
import { upsertPlanSchema } from "@/modules/plans/validators";
import { upsertPlan, deletePlan } from "@/features/plans/data/service";

function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) obj[k] = v;
  return obj;
}

export async function upsertPlanAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requireSuperAdmin();
    const parsed = upsertPlanSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return actionFail("Validasi gagal.");

    const res = await upsertPlan(parsed.data);
    return actionOk({ id: res.id });
  } catch (err) {
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:plans", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Terjadi kesalahan saat menyimpan paket.");
  }
}

export async function deletePlanAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requireSuperAdmin();
    await deletePlan(id);
    return actionOk({ id });
  } catch (err) {
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:plans", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Terjadi kesalahan saat menghapus paket.");
  }
}
