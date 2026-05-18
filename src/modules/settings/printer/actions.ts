"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, fieldErrorsFromZod } from "@/lib/action";
import { isAppError } from "@/lib/errors";
import { requireActiveTenant } from "@/lib/tenant-guards";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { UpdatePrinterSettingsFormSchema } from "@/modules/settings/printer/validators";
import { updatePrinterSettings } from "@/modules/settings/printer/service";

function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) obj[k] = v;
  return obj;
}

export async function updatePrinterSettingsAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ ok: true }>> {
  try {
    await requirePermission(PERMISSIONS.settings_write);
    const ctx = await requireActiveTenant();
    const parsed = UpdatePrinterSettingsFormSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };

    const res = await updatePrinterSettings({ tenantId: ctx.tenantId, input: parsed.data });
    if (!res.ok) return { ok: false, message: res.message };

    revalidatePath("/settings/printer");
    return { ok: true, data: { ok: true } };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menyimpan pengaturan printer." };
  }
}
