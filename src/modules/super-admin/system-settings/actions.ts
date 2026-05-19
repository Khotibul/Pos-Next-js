"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, fieldErrorsFromZod } from "@/lib/action";
import { isAppError } from "@/lib/errors";
import { requireSuperAdmin } from "@/lib/super-admin";
import { writeAuditLog } from "@/lib/audit";
import { upsertGlobalSettingSchema } from "@/modules/super-admin/system-settings/validators";
import { deleteGlobalSetting, upsertGlobalSetting } from "@/modules/super-admin/system-settings/service";

function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) obj[k] = v;
  return obj;
}

export async function upsertGlobalSettingAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireSuperAdmin();
    const parsed = upsertGlobalSettingSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };

    let value: unknown;
    try {
      value = JSON.parse(parsed.data.valueJson);
    } catch {
      return { ok: false, message: "valueJson harus JSON valid." };
    }

    const res = await upsertGlobalSetting({ id: parsed.data.id, key: parsed.data.key, value });
    await writeAuditLog({ tenantId: null, userId: user.id, action: parsed.data.id ? "UPDATE" : "CREATE", entity: "GlobalSetting", entityId: res.id, metadata: { key: parsed.data.key } });
    revalidatePath("/super-admin/system-settings");
    return { ok: true, data: res };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menyimpan global setting." };
  }
}

export async function deleteGlobalSettingAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireSuperAdmin();
    if (!id) return { ok: false, message: "ID tidak valid." };
    const res = await deleteGlobalSetting(id);
    await writeAuditLog({ tenantId: null, userId: user.id, action: "DELETE", entity: "GlobalSetting", entityId: id });
    revalidatePath("/super-admin/system-settings");
    return { ok: true, data: res };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menghapus global setting." };
  }
}

