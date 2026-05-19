import { requireSuperAdmin } from "@/lib/super-admin";
import { PageHeader } from "@/components/layout/page-header";
import { TenantsTable } from "@/modules/super-admin/tenants/components/tenants-table";
import { listPlansForSelect, listTenants } from "@/modules/super-admin/tenants/service";

export default async function SuperAdminTenantsPage() {
  await requireSuperAdmin();
  const [items, plans] = await Promise.all([listTenants(), listPlansForSelect()]);

  return (
    <div className="grid gap-6">
      <PageHeader title="Tenant / Bisnis" description="Aktivasi/nonaktif, trial, domain/subdomain, dan paket tenant." />
      <TenantsTable
        plans={plans}
        items={items.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          domain: t.domain ?? null,
          subdomain: t.subdomain ?? null,
          status: t.status,
          trialEndsAt: t.trialEndsAt ? t.trialEndsAt.toISOString() : null,
          suspendedAt: t.suspendedAt ? t.suspendedAt.toISOString() : null,
          planId: t.planId ?? null,
          planName: t.plan?.name ?? null,
          createdAt: t.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
