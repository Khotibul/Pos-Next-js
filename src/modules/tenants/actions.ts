"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ActionResult, fieldErrorsFromZod } from "@/lib/action";
import { isAppError } from "@/lib/errors";
import { auth } from "@/lib/auth";
import { createTenantFromOnboardingSchema } from "@/modules/tenants/validators";
import { createTenantForExistingUser } from "@/modules/tenants/service";

function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) obj[k] = v;
  return obj;
}

export async function completeOnboardingAction(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { ok: false, message: "Silakan login terlebih dahulu." };

    const parsed = createTenantFromOnboardingSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };

    const created = await createTenantForExistingUser({
      userId: session.user.id,
      tenantName: parsed.data.tenantName,
      planSlug: parsed.data.planSlug ?? null,
    });

    const cookieStore = await cookies();
    cookieStore.set("active_tenant_id", created.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    redirect("/dashboard");
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat membuat tenant." };
  }
}

