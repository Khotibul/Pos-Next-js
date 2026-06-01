import { PageHeader } from "@/components/layout/page-header";
import { requireSuperAdmin } from "@/lib/super-admin";
import { listSuperAdminSubscriptions } from "@/modules/super-admin/subscriptions/service";
import { SubscriptionTable } from "@/modules/super-admin/subscriptions/components/subscription-table";

function money(currency: string, value: unknown) {
  const num = Number(value);
  const safe = Number.isFinite(num) ? num : 0;
  if (currency === "IDR") return `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(safe)}`;
  return `${currency} ${safe}`;
}

export default async function SuperAdminSubscriptionsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const result = await listSuperAdminSubscriptions({ q: sp.q, page: Number(sp.page ?? 1) || 1, pageSize: 20 });

  return (
    <div className="grid gap-6">
      <PageHeader title="Subscription Management" description="Atur plan, trial extension, status subscription, dan suspend tenant." />
      <SubscriptionTable
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        plans={result.plans}
        items={result.items.map((tenant) => ({
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
          planId: tenant.planId,
          planName: tenant.plan?.name ?? null,
          priceMonthly: tenant.plan ? money(tenant.plan.currency, tenant.plan.priceMonthly) : "-",
          trialEndsAt: tenant.trialEndsAt ? tenant.trialEndsAt.toISOString() : null,
          createdAt: tenant.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
