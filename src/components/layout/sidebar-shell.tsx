"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, HelpCircle, LogOut, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/brand/app-logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { dashboardCopy, type Locale } from "@/lib/i18n";

export function SidebarShell({
  permissions,
  isSuperAdmin,
  locale,
}: {
  permissions: string[];
  isSuperAdmin: boolean;
  locale: Locale;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const toggleCollapsed = useCallback(() => setCollapsed((v) => !v), []);
  const copy = dashboardCopy[locale];

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen border-r border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,0.28),transparent_34%),linear-gradient(180deg,hsl(var(--sidebar)),hsl(var(--sidebar)/0.96))] text-[hsl(var(--sidebar-foreground))] shadow-2xl shadow-slate-950/10 transition-[width] duration-200 md:flex md:flex-col",
        collapsed ? "w-[68px]" : "w-60"
      )}
    >
      <div className="flex h-14 items-center justify-between px-2.5">
        <div className={cn("grid leading-tight", collapsed && "sr-only")}>
          <AppLogo href="/dashboard" className="w-fit rounded-xl bg-white/95 px-2 py-1 shadow-lg" imageClassName="h-7" />
          <div className="pl-10 text-[10px] font-medium uppercase tracking-[0.22em] text-white/45">SaaS Solutions</div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-8 w-8 rounded-xl p-0 text-white/70 hover:bg-white/10 hover:text-white", collapsed && "rotate-180")}
          onClick={toggleCollapsed}
          aria-label="Toggle sidebar"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Separator className="bg-white/10" />
      <div className={cn("min-h-0 flex-1 overflow-y-auto py-1.5 scrollbar-thin", collapsed && "px-0.5")}>
        <SidebarNav variant="sidebar" collapsed={collapsed} permissions={permissions} isSuperAdmin={isSuperAdmin} locale={locale} />
      </div>
      <div className="border-t border-white/10 px-2.5 py-2.5">
        <div className={cn("mb-2", collapsed && "hidden")}>
          {isSuperAdmin || permissions.includes(PERMISSIONS.sales_write) ? (
            <Button asChild className="h-10 w-full justify-start gap-2 rounded-xl bg-primary shadow-lg shadow-primary/25 text-sm">
              <Link href="/pos" prefetch>
                <Plus className="h-3.5 w-3.5" />
                {copy.newTransaction}
              </Link>
            </Button>
          ) : null}
        </div>
        <div className="grid gap-0.5">
          <Button variant="ghost" className={cn("h-9 justify-start gap-2 rounded-xl text-xs text-white/70 hover:bg-white/10 hover:text-white", collapsed && "justify-center px-2")}>
            <HelpCircle className="h-3.5 w-3.5 shrink-0" />
            <span className={cn(collapsed && "sr-only")}>{copy.helpCenter}</span>
          </Button>
          <Button asChild variant="ghost" className={cn("h-9 justify-start gap-2 rounded-xl text-xs text-white/70 hover:bg-white/10 hover:text-white", collapsed && "justify-center px-2")}>
            <Link href="/api/auth/signout">
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              <span className={cn(collapsed && "sr-only")}>{copy.logout}</span>
            </Link>
          </Button>
        </div>
      </div>
    </aside>
  );
}
