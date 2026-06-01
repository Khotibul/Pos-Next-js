"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, fieldErrorsFromZod } from "@/lib/action";
import { writeAuditLog } from "@/lib/audit";
import { isAppError } from "@/lib/errors";
import { requireSuperAdmin } from "@/lib/super-admin";
import { formDataToRecord } from "@/modules/super-admin/shared";
import { updateSubscriptionSchema } from "@/modules/super-admin/subscriptions/validators";
import { updateSuperAdminSubscription } from "@/modules/super-admin/subscriptions/service";

export async function updateSubscriptionAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireSuperAdmin();
    const parsed = updateSubscriptionSchema.safeParse(formDataToRecord(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };
    const result = await updateSuperAdminSubscription(parsed.data);
    await writeAuditLog({
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
    return { ok: false, message: "Gagal memperbarui subscription." };
  }
}
