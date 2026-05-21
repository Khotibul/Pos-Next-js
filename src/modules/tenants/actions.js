"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fieldErrorsFromZod } from "@/lib/action";
import { isAppError } from "@/lib/errors";
import { auth } from "@/lib/auth";
import { createTenantFromOnboardingSchema } from "@/modules/tenants/validators";
import { createTenantForExistingUser } from "@/modules/tenants/service";
import { redeemLicense } from "@/modules/licenses/service";

function formDataToObject(formData) {
  const obj = {};
  for (const [k, v] of formData.entries()) obj[k] = v;
  return obj;
}

export async function completeOnboardingAction(_prev, formData) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { ok: false, message: "Silakan login terlebih dahulu." };

    const parsed = createTenantFromOnboardingSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };

    const created = await createTenantForExistingUser({
      userId: session.user.id,
      tenantName: parsed.data.tenantName ?? null,
      planSlug: parsed.data.planSlug ?? null,
    });

    const serial = parsed.data.serial?.trim() || null;
    let activationFailed = false;
    if (serial) {
      try {
        await redeemLicense({ tenantId: created.id, serial });
      } catch {
        // Keep tenant in trial mode if activation fails; user can retry from Billing page.
        activationFailed = true;
      }
    }

    const cookieStore = await cookies();
    cookieStore.set("active_tenant_id", created.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    if (activationFailed) redirect("/billing?activation=failed");
    redirect("/dashboard");
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat membuat tenant." };
  }
}
