import { requireSuperAdmin } from "@/lib/super-admin";
import { PageHeader } from "@/components/layout/page-header";
import { TenantsTable } from "@/modules/super-admin/tenants/components/tenants-table";
import { listPlansForSelect, listTenants } from "@/modules/super-admin/tenants/service";

export default async function SuperAdminTenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; planId?: string; page?: string }>;
}) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const [result, plans] = await Promise.all([
    listTenants({ q: sp.q, status: sp.status, planId: sp.planId, page: Number(sp.page ?? 1) || 1, pageSize: 20 }),
    listPlansForSelect(),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader title="Tenant / Bisnis" description="Aktivasi/nonaktif, trial, domain/subdomain, dan paket tenant." />
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
