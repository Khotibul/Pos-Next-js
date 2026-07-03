import type { TenantContext } from "@/lib/tenant-context";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AppLogo } from "@/components/brand/app-logo";
import { UserMenu } from "@/components/layout/user-menu";
import { Bell, LayoutGrid, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { dashboardCopy, type Locale } from "@/lib/i18n";

export function Topbar({ locale, ctx }: { locale: Locale; ctx: TenantContext }) {
  const copy = dashboardCopy[locale];
  const tenantOptions = ctx.memberships.map((m) => ({
    tenantId: m.tenantId,
    tenantName: m.tenantName,
    tenantStatus: m.tenantStatus,
  }));

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between gap-1 border-b bg-background/88 px-2 shadow-sm shadow-slate-950/5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/72 sm:h-14 sm:px-3 md:h-16 md:px-4">
      <div className="flex min-w-0 items-center gap-1 sm:gap-2 md:gap-3">
        <MobileNav
          permissions={ctx.permissions}
          isSuperAdmin={ctx.isSuperAdmin}
          currentTenantId={ctx.tenantId}
          locale={locale}
          tenantOptions={tenantOptions}
        />
          <AppLogo href="/dashboard" className="lg:hidden" imageClassName="h-7 sm:h-8" />
        <div className="hidden lg:flex">
          <TenantSwitcher currentTenantId={ctx.tenantId} options={tenantOptions} />
        </div>
      </div>

      <div className="hidden flex-1 px-3 lg:block">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-9 w-full rounded-xl border bg-muted/35 px-10 text-sm font-medium outline-none ring-offset-background transition focus:border-primary/40 focus:bg-background focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={copy.topbarSearch}
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <Button variant="ghost" size="sm" className="hidden h-8 w-8 rounded-xl p-0 hover:bg-muted sm:inline-flex sm:h-9 sm:w-9" aria-label="Notifications">
          <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="hidden h-8 w-8 rounded-xl p-0 hover:bg-muted lg:inline-flex lg:h-9 lg:w-9" aria-label="Apps">
          <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
        <div className="hidden sm:block">
          <LanguageSwitcher locale={locale} label={copy.language} description={copy.languageDescription} activeLabel={copy.active} />
        </div>
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>
        <UserMenu name={ctx.userName} email={ctx.userEmail} image={ctx.userImage} />
      </div>
    </header>
  );
}
