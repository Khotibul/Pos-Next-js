"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, fieldErrorsFromZod } from "@/lib/action";
import { isAppError } from "@/lib/errors";
import { requireSuperAdmin } from "@/lib/super-admin";
import { writeAuditLog } from "@/lib/audit";
import { upsertAnnouncementSchema } from "@/modules/super-admin/announcements/validators";
import { deleteAnnouncement, upsertAnnouncement } from "@/modules/super-admin/announcements/service";

function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) obj[k] = v;
  return obj;
}

export async function upsertAnnouncementAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireSuperAdmin();
    const parsed = upsertAnnouncementSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };
    const res = await upsertAnnouncement(parsed.data);
    await writeAuditLog({
      tenantId: null,
      userId: user.id,
      action: parsed.data.id ? "UPDATE" : "CREATE",
      entity: "Announcement",
      entityId: res.id,
      metadata: { status: parsed.data.status },
    });
    revalidatePath("/super-admin/announcements");
    return { ok: true, data: res };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menyimpan pengumuman." };
  }
}

export async function deleteAnnouncementAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireSuperAdmin();
    if (!id) return { ok: false, message: "ID tidak valid." };
    const res = await deleteAnnouncement(id);
    await writeAuditLog({ tenantId: null, userId: user.id, action: "DELETE", entity: "Announcement", entityId: id });
    revalidatePath("/super-admin/announcements");
    return { ok: true, data: res };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menghapus pengumuman." };
  }
}

