"use server";

import { ActionResult, actionFail, actionOk } from "@/shared/server/errors/result";
import { isAppError } from "@/shared/server/errors/app-error";
import { requirePermission } from "@/shared/server/auth/permissions";
import { PERMISSIONS } from "@/shared/constants/permissions";
import { requireTenant } from "@/lib/tenant-guards";
import { requireSuperAdmin } from "@/lib/super-admin";
import { writeErrorLog } from "@/shared/server/monitoring/log-service";
import { redeemLicenseSchema, generateLicenseSchema } from "@/modules/licenses/validators";
import { redeemLicense, generateLicenses, revokeLicense } from "@/features/licenses/data/service";

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
    if (!parsed.success) return actionFail("Validasi gagal.");

    await redeemLicense({ tenantId: ctx.tenantId, serial: parsed.data.serial });
    return actionOk({ ok: true as const });
  } catch (err) {
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:licenses", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Gagal mengaktifkan tenant.");
  }
}

export async function generateLicenseKeysAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ serials: string[] }>> {
  try {
    await requireSuperAdmin();
    const parsed = generateLicenseSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return actionFail("Validasi gagal.");

    const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
    const created = await generateLicenses({ planSlug: parsed.data.planSlug, qty: parsed.data.qty, expiresAt });
    return actionOk({ serials: created.map((c) => c.serial) });
  } catch (err) {
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:licenses", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Gagal membuat license key.");
  }
}

export async function revokeLicenseKeyAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requireSuperAdmin();
    await revokeLicense({ id });
    return actionOk({ id });
  } catch (err) {
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:licenses", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Gagal revoke lisensi.");
  }
}
