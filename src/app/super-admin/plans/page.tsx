import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSuperAdmin } from "@/lib/super-admin";
import { SiteHeader } from "@/components/layout/site-header";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-grid" />
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <PageHeader
          title="Plans & Pricing"
          description="Atur trial days dan harga per bulan untuk setiap paket."
          actions={
            <Button asChild variant="outline" className="gap-2 rounded-xl">
              <Link href="/super-admin">
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Link>
            </Button>
          }
        />

        <div className="mt-6">
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
      </main>
    </div>
  );
}

