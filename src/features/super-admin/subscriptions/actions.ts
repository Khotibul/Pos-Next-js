"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, fieldErrorsFromZod } from "@/lib/action";
import { writeAuditLog } from "@/shared/server/audit";
import { isAppError } from "@/shared/server/errors/app-error";
import { requireSuperAdmin } from "@/lib/super-admin";
import { writeErrorLog } from "@/shared/server/monitoring/log-service";
import { formDataToRecord } from "@/features/super-admin/shared";
import { updateSubscriptionSchema } from "@/features/super-admin/subscriptions/validators";
import { updateSuperAdminSubscription } from "@/features/super-admin/subscriptions/data/service";

export async function updateSubscriptionAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireSuperAdmin();
    const parsed = updateSubscriptionSchema.safeParse(formDataToRecord(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };
    const result = await updateSuperAdminSubscription(parsed.data);
    void writeAuditLog({
      tenantId: result.id,
      userId: actor.id,
      action: "UPDATE_SUBSCRIPTION",
      entity: "Tenant",
      entityId: result.id,
      metadata: { planId: parsed.data.planId ?? null, status: parsed.data.status, trialEndsAt: parsed.data.trialEndsAt ?? null },
    });
    revalidatePath("/super-admin/subscriptions");
    revalidatePath("/super-admin/tenants");
    return { ok: true, data: result };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    await writeErrorLog({ source: "module:super-admin-subscriptions", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return { ok: false, message: "Gagal memperbarui subscription." };
  }
}
