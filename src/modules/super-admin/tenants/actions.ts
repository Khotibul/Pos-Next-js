"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, fieldErrorsFromZod } from "@/lib/action";
import { isAppError } from "@/lib/errors";
import { requireSuperAdmin } from "@/lib/super-admin";
import { writeAuditLog } from "@/lib/audit";
import { upsertTenantSchema } from "@/modules/super-admin/tenants/validators";
import { upsertTenant } from "@/modules/super-admin/tenants/service";

function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) obj[k] = v;
  return obj;
}

export async function upsertTenantAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireSuperAdmin();
    const parsed = upsertTenantSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };

    const res = await upsertTenant(parsed.data);
    await writeAuditLog({
      tenantId: null,
      userId: user.id,
      action: parsed.data.id ? "UPDATE" : "CREATE",
      entity: "Tenant",
      entityId: res.id,
      metadata: { slug: parsed.data.slug, planId: parsed.data.planId ?? null, status: parsed.data.status ?? null },
    });

    revalidatePath("/super-admin");
    revalidatePath("/super-admin/tenants");
    return { ok: true, data: res };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menyimpan tenant." };
  }
}

