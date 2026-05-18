import { RegisterTenantForm } from "@/app/(auth)/register/register-tenant-form";

export default async function RegisterTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const sp = await searchParams;
  const planSlug = (sp.plan || "pro").toLowerCase();
  return <RegisterTenantForm planSlug={planSlug} />;
}

