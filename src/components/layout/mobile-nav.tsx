"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Plus, LogOut, HelpCircle, Search, Sparkles, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AppLogo } from "@/components/brand/app-logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TenantSwitcher, type TenantOption } from "@/components/layout/tenant-switcher";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { dashboardCopy, type Locale } from "@/lib/i18n";

export function MobileNav({
  permissions,
  isSuperAdmin,
  currentTenantId,
  tenantOptions,
  locale,
}: {
  permissions: string[];
  isSuperAdmin: boolean;
  currentTenantId: string;
  tenantOptions: TenantOption[];
  locale: Locale;
}) {
  const [open, setOpen] = useState(false);
  const copy = dashboardCopy[locale];
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-9 w-9 rounded-xl p-0 md:hidden" aria-label="Open menu">
          <Menu className="h-[18px] w-[18px]" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-[304px] max-w-[88vw] flex-col overflow-hidden border-r bg-background p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>

        <div className="relative overflow-hidden bg-[radial-gradient(circle_at_8%_0%,rgba(37,99,235,0.26),transparent_42%),linear-gradient(135deg,hsl(var(--sidebar)),hsl(var(--sidebar)/0.96))] px-3.5 pb-3.5 pt-3 text-white">
          <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/25 blur-3xl" />
          <div className="flex items-center justify-between">
            <div className="grid leading-tight">
              <AppLogo href="/dashboard" className="w-fit rounded-xl bg-white/95 px-2.5 py-1.5 shadow-lg" imageClassName="h-7" />
              <div className="pl-9 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/50">SaaS Solutions</div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-xl p-0 text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-white/10 p-2.5 shadow-xl shadow-slate-950/20 backdrop-blur">
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
              <Sparkles className="h-3 w-3" />
              {copy.activeTenant}
            </div>
            <TenantSwitcher currentTenantId={currentTenantId} options={tenantOptions} />
          </div>
        </div>

        <div className="hidden h-16 items-center justify-between px-4">
          <AppLogo href="/dashboard" imageClassName="h-9" />
        </div>

        <div className="px-3 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-10 w-full rounded-xl border bg-muted/40 px-9 text-xs font-medium outline-none ring-offset-background transition focus:border-primary/40 focus:bg-background focus-visible:ring-2 focus-visible:ring-ring"
              placeholder={copy.searchMenu}
            />
          </div>
          <div className="mt-2">
            <LanguageSwitcher locale={locale} label={copy.language} description={copy.languageDescription} activeLabel={copy.active} />
          </div>

          {isSuperAdmin || permissions.includes(PERMISSIONS.sales_write) ? (
            <div className="mt-2">
              <Button asChild className="h-10 w-full justify-start gap-2 rounded-xl text-sm shadow-lg shadow-primary/20" onClick={() => setOpen(false)}>
                <Link href="/pos" prefetch>
                  <Plus className="h-3.5 w-3.5" />
                  {copy.newTransaction}
                </Link>
              </Button>
            </div>
          ) : null}
        </div>

        <Separator />

        <div className="flex-1 overflow-y-auto py-1.5">
          <SidebarNav variant="sheet" onNavigate={() => setOpen(false)} permissions={permissions} isSuperAdmin={isSuperAdmin} locale={locale} />
        </div>

        <Separator />

        <div className="grid gap-1 p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <Button type="button" variant="ghost" className="h-10 justify-start gap-2 rounded-xl text-sm" onClick={() => setOpen(false)}>
            <HelpCircle className="h-3.5 w-3.5" />
            {copy.helpCenter}
          </Button>
          <Button asChild type="button" variant="ghost" className="h-10 justify-start gap-2 rounded-xl text-sm">
            <Link href="/api/auth/signout">
              <LogOut className="h-3.5 w-3.5" />
              {copy.logout}
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
