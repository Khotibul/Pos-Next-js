import { requireSuperAdmin } from "@/lib/super-admin";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/layout/stat-card";
import { Building2, CreditCard, Receipt, ShoppingCart } from "lucide-react";

export default async function SuperAdminPage() {
  await requireSuperAdmin();
  const [totalTenants, activeTenants, totalTransactions, sumSales] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: { in: ["ACTIVE", "TRIAL"] } } }),
    prisma.sale.count(),
    prisma.sale.aggregate({ _sum: { total: true } }),
  ]);

  const revenue = Number(sumSales._sum.total ?? 0);
  const revenueFmt = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(revenue);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard SaaS</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ringkasan tenant, transaksi lintas tenant, dan status langganan.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Building2 className="h-5 w-5" />} title="Total Tenant" value={totalTenants.toLocaleString("id-ID")} />
        <StatCard icon={<CreditCard className="h-5 w-5" />} title="Toko Aktif" value={activeTenants.toLocaleString("id-ID")} />
        <StatCard icon={<ShoppingCart className="h-5 w-5" />} title="Total Transaksi" value={totalTransactions.toLocaleString("id-ID")} />
        <StatCard icon={<Receipt className="h-5 w-5" />} title="Omzet (All)" value={revenueFmt} />
      </div>
    </div>
  );
}
