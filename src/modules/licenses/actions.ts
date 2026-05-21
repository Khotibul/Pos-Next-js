"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, fieldErrorsFromZod } from "@/lib/action";
import { isAppError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requireTenant } from "@/lib/tenant-guards";
import { requireSuperAdmin } from "@/lib/super-admin";
import { redeemLicenseSchema, generateLicenseSchema } from "@/modules/licenses/validators";
import { redeemLicense, generateLicenses, revokeLicense } from "@/modules/licenses/service";

function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) obj[k] = v;
  return obj;
}

export async function redeemLicenseAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ ok: true }>> {
  try {
    await requirePermission(PERMISSIONS.billing_read);
    const ctx = await requireTenant();
    const parsed = redeemLicenseSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };

    await redeemLicense({ tenantId: ctx.tenantId, serial: parsed.data.serial });

    revalidatePath("/billing");
    revalidatePath("/dashboard");
    return { ok: true, data: { ok: true } };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Gagal mengaktifkan tenant." };
  }
}

export async function generateLicenseKeysAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ serials: string[] }>> {
  try {
    await requireSuperAdmin();
    const parsed = generateLicenseSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };

    const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
    const created = await generateLicenses({ planSlug: parsed.data.planSlug, qty: parsed.data.qty, expiresAt });

    revalidatePath("/super-admin/licenses");
    return { ok: true, data: { serials: created.map((c) => c.serial) } };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Gagal membuat license key." };
  }
}

export async function revokeLicenseKeyAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requireSuperAdmin();
    await revokeLicense({ id });
    revalidatePath("/super-admin/licenses");
    return { ok: true, data: { id } };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Gagal revoke lisensi." };
  }
}

