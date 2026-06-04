"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, fieldErrorsFromZod } from "@/lib/action";
import { isAppError } from "@/lib/errors";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { requireActiveTenant } from "@/lib/tenant-guards";
import { updateCustomerDisplaySettings } from "@/modules/settings/customer-display/service";
import { UpdateCustomerDisplaySettingsFormSchema } from "@/modules/settings/customer-display/validators";

function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) obj[key] = value;
  return obj;
}

export async function updateCustomerDisplaySettingsAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ ok: true }>> {
  try {
    await requirePermission(PERMISSIONS.settings_write);
    const ctx = await requireActiveTenant();
    const parsed = UpdateCustomerDisplaySettingsFormSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) {
      return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };
    }

    const result = await updateCustomerDisplaySettings({ tenantId: ctx.tenantId, input: parsed.data });
    if (!result.ok) return { ok: false, message: result.message };

    revalidatePath("/settings/customer-display");
    return { ok: true, data: { ok: true } };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    return { ok: false, message: "Terjadi kesalahan saat menyimpan pengaturan customer display." };
  }
}
