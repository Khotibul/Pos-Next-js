import { RegisterTenantForm } from "@/app/(auth)/register/register-tenant-form";

export default async function RegisterTenantPage({ searchParams }) {
  const sp = await searchParams;
  const planSlug = (sp?.plan || "pro").toLowerCase();
  const error = sp?.error || null;
  const initialError =
    error === "OAUTH_REG_EXPIRED"
      ? "Registrasi Google sudah kedaluwarsa. Silakan klik \"Daftar dengan Google\" lagi."
      : null;
  return <RegisterTenantForm planSlug={planSlug} initialError={initialError} />;
}

