import { getTenantContext } from "@/lib/tenant-context";
import { redirect } from "next/navigation";
import { SidebarShell } from "@/components/layout/sidebar-shell";
import { Topbar } from "@/components/layout/topbar";
import { DashboardBottomNav } from "@/components/layout/dashboard-bottom-nav";
import { DesktopLicenseGate } from "@/components/layout/desktop-license-gate";
import { requireEmailVerified } from "@/lib/guards/require-email-verified";
import { requireTenantAccess } from "@/lib/guards/require-tenant-access";
import { dashboardCopy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { createDevTimer } from "@/lib/perf";

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
  endLayout();

  const tenantStatusBanner = (ctx.tenantStatus === "SUSPENDED" || ctx.tenantStatus === "EXPIRED") ? (
    <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm animate-fade-in">
      <div className="font-medium">{copy.restrictedAccess}</div>
      <div className="text-muted-foreground">
        Status tenant: <span className="font-mono">{ctx.tenantStatus}</span>. {copy.restrictedDescription}
      </div>
    </div>
  ) : null;

  return (
    <div className="min-h-dvh bg-app">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-grid" />
      <DesktopLicenseGate />
      <div className="flex">
        <SidebarShell permissions={ctx.permissions} isSuperAdmin={ctx.isSuperAdmin} locale={locale} />
        <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
          <Topbar locale={locale} ctx={ctx} />
          <main className="flex-1 px-3 py-3 pb-24 sm:px-5 md:px-6 md:py-5 md:pb-6 animate-fade-in">
            {tenantStatusBanner}
            <div className="mx-auto w-full max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
      <DashboardBottomNav permissions={ctx.permissions} isSuperAdmin={ctx.isSuperAdmin} />
    </div>
  );
}
