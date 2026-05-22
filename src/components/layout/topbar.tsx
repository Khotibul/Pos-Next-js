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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur">
      <div className="flex items-center gap-3">
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
        <div className="md:hidden text-sm font-semibold tracking-tight text-primary">POSify SaaS</div>
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
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-11 w-full rounded-full border bg-background px-10 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Cari data, produk, atau laporan..."
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="sm" className="h-10 w-10 p-0" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="hidden h-10 w-10 p-0 md:inline-flex" aria-label="Apps">
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <ThemeToggle />
        <UserMenu name={ctx.userName} email={ctx.userEmail} image={ctx.userImage} />
      </div>
    </header>
  );
}
