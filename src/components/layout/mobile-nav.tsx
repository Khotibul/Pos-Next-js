"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Plus, LogOut, HelpCircle, Search, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AppLogo } from "@/components/brand/app-logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TenantSwitcher, type TenantOption } from "@/components/layout/tenant-switcher";
import { PERMISSIONS } from "@/lib/permissions-keys";

export function MobileNav({
  permissions,
  isSuperAdmin,
  currentTenantId,
  tenantOptions,
}: {
  permissions: string[];
  isSuperAdmin: boolean;
  currentTenantId: string;
  tenantOptions: TenantOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-10 w-10 rounded-2xl p-0 md:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-[360px] max-w-[94vw] flex-col overflow-hidden p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>

        <div className="relative overflow-hidden bg-[radial-gradient(circle_at_10%_0%,rgba(37,99,235,0.32),transparent_42%),linear-gradient(135deg,hsl(var(--sidebar)),hsl(var(--sidebar)/0.94))] px-4 pb-5 pt-4 text-white">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/30 blur-3xl" />
          <div className="flex items-center justify-between">
            <div className="grid leading-tight">
              <AppLogo href="/dashboard" className="w-fit rounded-2xl bg-white/95 px-3 py-2 shadow-lg" imageClassName="h-9" />
              <div className="pl-12 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">SaaS Solutions</div>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-white/10 bg-white/10 p-3 shadow-xl shadow-slate-950/20 backdrop-blur">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
              <Sparkles className="h-3.5 w-3.5" />
              Tenant aktif
            </div>
            <TenantSwitcher currentTenantId={currentTenantId} options={tenantOptions} />
          </div>
        </div>

        <div className="hidden h-16 items-center justify-between px-4">
          <AppLogo href="/dashboard" imageClassName="h-9" />
        </div>

        <div className="px-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-12 w-full rounded-2xl border bg-muted/40 px-10 text-sm font-medium outline-none ring-offset-background transition focus:border-primary/40 focus:bg-background focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Cari menu..."
            />
          </div>

          {isSuperAdmin || permissions.includes(PERMISSIONS.sales_write) ? (
            <div className="mt-3">
              <Button asChild className="h-12 w-full justify-start gap-2 rounded-2xl shadow-lg shadow-primary/20" onClick={() => setOpen(false)}>
                <Link href="/pos" prefetch>
                  <Plus className="h-4 w-4" />
                  New Transaction
                </Link>
              </Button>
            </div>
          ) : null}
        </div>

        <Separator />

        <div className="flex-1 overflow-y-auto py-2">
          <SidebarNav variant="sheet" onNavigate={() => setOpen(false)} permissions={permissions} isSuperAdmin={isSuperAdmin} />
        </div>

        <Separator />

        <div className="grid gap-1 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button type="button" variant="ghost" className="h-11 justify-start gap-2 rounded-2xl" onClick={() => setOpen(false)}>
            <HelpCircle className="h-4 w-4" />
            Help Center
          </Button>
          <Button asChild type="button" variant="ghost" className="h-11 justify-start gap-2 rounded-2xl">
            <Link href="/api/auth/signout">
              <LogOut className="h-4 w-4" />
              Logout
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
