import { getTenantContext } from "@/lib/tenant-context";
import { redirect } from "next/navigation";
import { SidebarShell } from "@/components/layout/sidebar-shell";
import { Topbar } from "@/components/layout/topbar";
import { DashboardBottomNav, type DashboardNavItem } from "@/components/layout/dashboard-bottom-nav";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { DesktopLicenseGate } from "@/components/layout/desktop-license-gate";
import { requireEmailVerified } from "@/lib/guards/require-email-verified";
import { requireTenantAccess } from "@/lib/guards/require-tenant-access";
import { cacheKeys, CACHE_TTL } from "@/lib/cache-keys";
import { getCache, setCache } from "@/lib/redis";
import { createDevTimer } from "@/lib/perf";
import { dashboardCopy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

// Dashboard routes depend on cookies/session/permissions and must not be statically prerendered.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const endLayout = createDevTimer("dashboard.layout");
  await requireEmailVerified();
  const locale = await getRequestLocale();
  const copy = dashboardCopy[locale];
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  await requireTenantAccess({ tenantId: ctx.tenantId, userId: ctx.userId, isSuperAdmin: ctx.isSuperAdmin });

  const sidebarKey = `${cacheKeys.sidebar(ctx.tenantId, ctx.userId)}:${locale}`;
  const cachedSidebar = await getCache<{ bottomItems: DashboardNavItem[] }>(sidebarKey);
  const bottomItems =
    cachedSidebar?.bottomItems ??
    (() => {
      const can = (perm: string) => ctx.isSuperAdmin || ctx.permissions.includes(perm);
      return [
        can(PERMISSIONS.dashboard_read) ? { href: "/dashboard", label: copy.bottomHome, iconKey: "home" } : null,
        can(PERMISSIONS.products_read) ? { href: "/products", label: copy.bottomInventory, iconKey: "inventory", match: ["/products"] } : null,
        can(PERMISSIONS.sales_read) ? { href: "/sales", label: copy.bottomTransactions, iconKey: "transactions", match: ["/sales", "/pos"] } : null,
        can(PERMISSIONS.reports_read) ? { href: "/reports", label: copy.bottomReports, iconKey: "reports" } : null,
        can(PERMISSIONS.settings_read) ? { href: "/settings", label: copy.bottomAdmin, iconKey: "admin" } : null,
      ].filter(Boolean) as DashboardNavItem[];
    })();
  if (!cachedSidebar) await setCache(sidebarKey, { bottomItems }, CACHE_TTL.sidebar);
  endLayout();

  return (
    <div className="min-h-screen bg-app">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-grid" />
      <DesktopLicenseGate />
      <div className="flex">
        <SidebarShell permissions={ctx.permissions} isSuperAdmin={ctx.isSuperAdmin} locale={locale} />
        <div className="flex min-h-screen flex-1 flex-col">
          <Topbar locale={locale} ctx={ctx} />
          <main className="flex-1 px-3 py-4 pb-28 sm:px-5 md:px-6 md:py-6 md:pb-6">
            {ctx.tenantStatus === "SUSPENDED" || ctx.tenantStatus === "EXPIRED" ? (
              <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                <div className="font-medium">{copy.restrictedAccess}</div>
                <div className="text-muted-foreground">
                  Status tenant: <span className="font-mono">{ctx.tenantStatus}</span>. {copy.restrictedDescription}
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
