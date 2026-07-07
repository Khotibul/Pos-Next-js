"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAppError } from "@/shared/server/errors/app-error";
import { auth } from "@/lib/auth";
import { createTenantFromOnboardingSchema } from "@/modules/tenants/validators";
import { createTenantForExistingUser } from "@/features/tenants/data/service";
import { redeemLicense } from "@/modules/licenses/service";

function formDataToObject(formData: FormData) {
  const obj: Record<string, string> = {};
  for (const [k, v] of formData.entries()) obj[k] = v as string;
  return obj;
}

export async function completeOnboardingAction(_prev: unknown, formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { ok: false, message: "Silakan login terlebih dahulu." };

    const parsed = createTenantFromOnboardingSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: parsed.error.errors ? Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message])) : undefined };

    const created = await createTenantForExistingUser({ userId: session.user.id, tenantName: parsed.data.tenantName ?? null, planSlug: parsed.data.planSlug ?? null });

    const serial = parsed.data.serial?.trim() || null;
    let activationFailed = false;
    if (serial) {
      try {
        await redeemLicense({ tenantId: created.id, serial });
      } catch { activationFailed = true; }
    }

    const cookieStore = await cookies();
    cookieStore.set("active_tenant_id", created.id, { httpOnly: true, sameSite: "lax", path: "/" });

    if (activationFailed) redirect("/billing?activation=failed");
    redirect("/dashboard");
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    const e = err as { code?: string };
    if (e && typeof e === "object" && e.code === "P2028") return { ok: false, message: "Koneksi database sedang sibuk. Silakan coba lagi dalam beberapa detik." };
    if (e && typeof e === "object" && e.code === "P1001") return { ok: false, message: "Database tidak dapat diakses saat ini. Silakan coba lagi." };
    console.error("[onboarding] create tenant failed", err);
    return { ok: false, message: "Terjadi kesalahan saat membuat tenant." };
  }
}
