"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, fieldErrorsFromZod } from "@/lib/action";
import { isAppError } from "@/lib/errors";
import { requireSuperAdmin } from "@/lib/super-admin";
import { writeAuditLog } from "@/lib/audit";
import { upsertAdminSchema } from "@/modules/super-admin/admins/validators";
import { revokeInternalAdmin, upsertInternalAdmin } from "@/modules/super-admin/admins/service";

function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) obj[k] = v;
  return obj;
}

export async function upsertInternalAdminAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireSuperAdmin();
    const parsed = upsertAdminSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };

    const res = await upsertInternalAdmin(parsed.data);
    await writeAuditLog({ tenantId: null, userId: user.id, action: "UPSERT", entity: "InternalAdmin", entityId: res.id, metadata: { email: parsed.data.email } });
    revalidatePath("/super-admin/admins");
    return { ok: true, data: res };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menyimpan admin internal." };
  }
}

export async function revokeInternalAdminAction(userId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireSuperAdmin();
    if (!userId) return { ok: false, message: "ID tidak valid." };
    const res = await revokeInternalAdmin({ userId, currentUserId: user.id });
    await writeAuditLog({ tenantId: null, userId: user.id, action: "REVOKE", entity: "InternalAdmin", entityId: userId });
    revalidatePath("/super-admin/admins");
    return { ok: true, data: res };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat mencabut admin internal." };
  }
}

