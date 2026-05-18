"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, fieldErrorsFromZod } from "@/lib/action";
import { isAppError } from "@/lib/errors";
import { requireSuperAdmin } from "@/lib/super-admin";
import { upsertPlanSchema } from "@/modules/plans/validators";
import { deletePlan, upsertPlan } from "@/modules/plans/service";

function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) obj[k] = v;
  return obj;
}

export async function upsertPlanAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requireSuperAdmin();
    const parsed = upsertPlanSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };

    const res = await upsertPlan(parsed.data);
    revalidatePath("/super-admin/plans");
    revalidatePath("/pricing");
    return { ok: true, data: res };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menyimpan paket." };
  }
}

export async function deletePlanAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requireSuperAdmin();
    if (!id) return { ok: false, message: "ID tidak valid." };
    await deletePlan(id);
    revalidatePath("/super-admin/plans");
    revalidatePath("/pricing");
    return { ok: true, data: { id } };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menghapus paket." };
  }
}

