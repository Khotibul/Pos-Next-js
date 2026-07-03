"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
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
  const close = useCallback(() => setOpen(false), []);
  const copy = dashboardCopy[locale];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 rounded-lg p-0 md:hidden" aria-label="Open menu">
          <Menu className="h-[16px] w-[16px]" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-[280px] max-w-[85vw] flex-col overflow-hidden border-r bg-background p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>

        <div className="relative overflow-hidden bg-[radial-gradient(circle_at_8%_0%,rgba(37,99,235,0.26),transparent_42%),linear-gradient(135deg,hsl(var(--sidebar)),hsl(var(--sidebar)/0.96))] px-3 pb-3 pt-2.5 text-white">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/25 blur-3xl" />
          <div className="flex items-center justify-between">
            <div className="grid leading-tight">
              <AppLogo href="/dashboard" className="w-fit rounded-xl bg-white/95 px-2 py-1 shadow-lg" imageClassName="h-6" />
              <div className="pl-8 text-[8px] font-semibold uppercase tracking-[0.2em] text-white/50">SaaS Solutions</div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 rounded-lg p-0 text-white/70 hover:bg-white/10 hover:text-white"
              onClick={close}
              aria-label="Close menu"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="mt-2.5 rounded-xl border border-white/10 bg-white/10 p-2 shadow-xl shadow-slate-950/20 backdrop-blur">
            <div className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/60">
              <Sparkles className="h-2.5 w-2.5" />
              {copy.activeTenant}
            </div>
            <TenantSwitcher currentTenantId={currentTenantId} options={tenantOptions} />
          </div>
        </div>

        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-9 w-full rounded-lg border bg-muted/40 px-8 text-xs font-medium outline-none ring-offset-background transition focus:border-primary/40 focus:bg-background focus-visible:ring-2 focus-visible:ring-ring"
              placeholder={copy.searchMenu}
            />
          </div>
          <div className="mt-1.5">
            <LanguageSwitcher locale={locale} label={copy.language} description={copy.languageDescription} activeLabel={copy.active} />
          </div>

          {isSuperAdmin || permissions.includes(PERMISSIONS.sales_write) ? (
            <div className="mt-1.5">
              <Button asChild className="h-9 w-full justify-start gap-2 rounded-lg text-sm shadow-lg shadow-primary/20" onClick={close}>
                <Link href="/pos" prefetch>
                  <Plus className="h-3 w-3" />
                  {copy.newTransaction}
                </Link>
              </Button>
            </div>
          ) : null}
        </div>

        <Separator />

        <div className="flex-1 overflow-y-auto py-1 scrollbar-thin">
          <SidebarNav variant="sheet" onNavigate={close} permissions={permissions} isSuperAdmin={isSuperAdmin} locale={locale} />
        </div>

        <Separator />

        <div className="grid gap-0.5 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <Button type="button" variant="ghost" className="h-9 justify-start gap-2 rounded-lg text-sm" onClick={close}>
            <HelpCircle className="h-3 w-3" />
            {copy.helpCenter}
          </Button>
          <Button asChild type="button" variant="ghost" className="h-9 justify-start gap-2 rounded-lg text-sm">
            <Link href="/api/auth/signout">
              <LogOut className="h-3 w-3" />
              {copy.logout}
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
