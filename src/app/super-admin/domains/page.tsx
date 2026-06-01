import { requireSuperAdmin } from "@/lib/super-admin";
import { PageHeader } from "@/components/layout/page-header";
import { TenantsTable } from "@/modules/super-admin/tenants/components/tenants-table";
import { listPlansForSelect, listTenants } from "@/modules/super-admin/tenants/service";

export default async function SuperAdminDomainsPage() {
  await requireSuperAdmin();
  const [result, plans] = await Promise.all([listTenants({ page: 1, pageSize: 50 }), listPlansForSelect()]);

  return (
    <div className="grid gap-6">
      <PageHeader title="Domain / Subdomain Tenant" description="Kelola domain/subdomain tenant untuk custom domain." />
      <TenantsTable
        plans={plans}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        items={result.items.map((t) => ({
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
          ownerName: t.memberships[0]?.user.name ?? null,
          ownerEmail: t.memberships[0]?.user.email ?? null,
          userCount: t._count.memberships,
          branchCount: t._count.branches,
          transactionCount: t._count.sales,
          createdAt: t.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
