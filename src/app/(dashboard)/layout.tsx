import { getTenantContext } from "@/lib/tenant-context";
import { redirect } from "next/navigation";
import { SidebarShell } from "@/components/layout/sidebar-shell";
import { Topbar } from "@/components/layout/topbar";
import { DashboardBottomNav, type DashboardNavItem } from "@/components/layout/dashboard-bottom-nav";
import { PERMISSIONS } from "@/lib/permissions-keys";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");

  const can = (perm: string) => ctx.isSuperAdmin || ctx.permissions.includes(perm);
  const bottomItems: DashboardNavItem[] = [
    can(PERMISSIONS.dashboard_read) ? { href: "/dashboard", label: "Home", iconKey: "home" } : null,
    can(PERMISSIONS.products_read) ? { href: "/products", label: "Inventaris", iconKey: "inventory", match: ["/products"] } : null,
    can(PERMISSIONS.sales_read) ? { href: "/sales", label: "Transaksi", iconKey: "transactions", match: ["/sales", "/pos"] } : null,
    can(PERMISSIONS.reports_read) ? { href: "/reports", label: "Laporan", iconKey: "reports" } : null,
    can(PERMISSIONS.settings_read) ? { href: "/settings", label: "Admin", iconKey: "admin" } : null,
  ].filter(Boolean) as DashboardNavItem[];

  return (
    <div className="min-h-screen bg-app">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-grid" />
      <div className="flex">
        <SidebarShell permissions={ctx.permissions} isSuperAdmin={ctx.isSuperAdmin} />
        <div className="flex min-h-screen flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-6 py-6 pb-28 md:pb-6">
            {ctx.tenantStatus === "SUSPENDED" || ctx.tenantStatus === "EXPIRED" ? (
              <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                <div className="font-medium">Akses dibatasi</div>
                <div className="text-muted-foreground">
                  Status tenant: <span className="font-mono">{ctx.tenantStatus}</span>. Aksi tulis/transaksi akan
                  ditolak sampai billing dibereskan.
                </div>
              </div>
            ) : null}
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
      <DashboardBottomNav items={bottomItems} />
    </div>
  );
}
