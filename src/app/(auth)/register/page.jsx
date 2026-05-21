import { RegisterTenantForm } from "@/app/(auth)/register/register-tenant-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default async function RegisterTenantPage({ searchParams }) {
  const sp = await searchParams;
  const planSlug = (sp?.plan || "pro").toLowerCase();
  const error = sp?.error || null;
  const initialError =
    error === "OAUTH_REG_EXPIRED"
      ? "Registrasi Google sudah kedaluwarsa. Silakan klik \"Daftar dengan Google\" lagi."
      : null;
  return (
    <AuthShell
      variant="register"
      heroSide="right"
      topText="Sudah punya akun?"
      topLinkLabel="Masuk"
      topLinkHref="/login"
    >
      <RegisterTenantForm planSlug={planSlug} initialError={initialError} />
    </AuthShell>
  );
}

