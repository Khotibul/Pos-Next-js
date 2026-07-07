"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, fieldErrorsFromZod } from "@/lib/action";
import { isAppError } from "@/shared/server/errors/app-error";
import { requireSuperAdmin } from "@/lib/super-admin";
import { writeAuditLog } from "@/shared/server/audit";
import { invalidateTenantCache } from "@/shared/server/cache";
import { writeErrorLog } from "@/shared/server/monitoring/log-service";
import { upsertTenantSchema } from "@/features/super-admin/tenants/validators";
import { upsertTenant } from "@/features/super-admin/tenants/data/service";

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
    void writeAuditLog({
      tenantId: null,
      userId: user.id,
      action: parsed.data.id ? "UPDATE" : "CREATE",
      entity: "Tenant",
      entityId: res.id,
      metadata: { slug: parsed.data.slug, planId: parsed.data.planId ?? null, status: parsed.data.status ?? null },
    });
    await invalidateTenantCache(res.id);

    revalidatePath("/super-admin");
    revalidatePath("/super-admin/tenants");
    return { ok: true, data: res };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    await writeErrorLog({ source: "module:super-admin-tenants", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return { ok: false, message: "Terjadi kesalahan saat menyimpan tenant." };
  }
}
