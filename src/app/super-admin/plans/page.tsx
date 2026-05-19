import { requireSuperAdmin } from "@/lib/super-admin";
import { PageHeader } from "@/components/layout/page-header";
import { PlansTable } from "@/modules/plans/components/plans-table";
import { listPlans } from "@/modules/plans/service";

function formatPrice(currency: string, value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  const n = Number.isFinite(num) ? num : 0;
  if (currency === "IDR") {
    return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
  }
  return String(n);
}

export default async function SuperAdminPlansPage() {
  await requireSuperAdmin();
  const items = await listPlans();

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Paket & Harga"
        description="Atur trial days dan harga per bulan untuk setiap paket."
      />

      <PlansTable
        items={items.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          description: p.description,
          currency: p.currency,
          priceMonthly: formatPrice(p.currency, p.priceMonthly),
          trialDays: p.trialDays,
          isPopular: p.isPopular,
          isActive: p.isActive,
          updatedAt: p.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
