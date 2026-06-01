import { getTenantContext } from "@/lib/tenant-context";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { Bell, LayoutGrid, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export async function Topbar() {
  const ctx = await getTenantContext();
  return (
    <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between gap-3 border-b bg-background/82 px-3 shadow-sm shadow-slate-950/5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 sm:px-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <MobileNav
          permissions={ctx.permissions}
          isSuperAdmin={ctx.isSuperAdmin}
          currentTenantId={ctx.tenantId}
          tenantOptions={ctx.memberships.map((m) => ({
            tenantId: m.tenantId,
            tenantName: m.tenantName,
            tenantStatus: m.tenantStatus,
          }))}
        />
        <div className="min-w-0 md:hidden">
          <div className="truncate text-base font-bold tracking-[-0.04em] text-primary">POS Pro</div>
          <div className="-mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">SaaS</div>
        </div>
        <div className="hidden md:flex">
          <TenantSwitcher
            currentTenantId={ctx.tenantId}
            options={ctx.memberships.map((m) => ({
              tenantId: m.tenantId,
              tenantName: m.tenantName,
              tenantStatus: m.tenantStatus,
            }))}
          />
        </div>
      </div>
      <div className="hidden flex-1 px-4 md:block">
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-12 w-full rounded-2xl border bg-muted/35 px-10 text-sm font-medium outline-none ring-offset-background transition focus:border-primary/40 focus:bg-background focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Cari data, produk, atau laporan..."
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        <Button variant="ghost" size="sm" className="h-10 w-10 rounded-2xl p-0 hover:bg-muted" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="hidden h-10 w-10 rounded-2xl p-0 hover:bg-muted md:inline-flex" aria-label="Apps">
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <ThemeToggle />
        <UserMenu name={ctx.userName} email={ctx.userEmail} image={ctx.userImage} />
      </div>
    </header>
  );
}
