"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, HelpCircle, LogOut, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/brand/app-logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { PERMISSIONS } from "@/lib/permissions-keys";

export function SidebarShell({ permissions, isSuperAdmin }: { permissions: string[]; isSuperAdmin: boolean }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen border-r border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,0.28),transparent_34%),linear-gradient(180deg,hsl(var(--sidebar)),hsl(var(--sidebar)/0.96))] text-[hsl(var(--sidebar-foreground))] shadow-2xl shadow-slate-950/10 transition-[width] duration-300 md:flex md:flex-col",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between px-3">
        <div className={cn("grid leading-tight", collapsed && "sr-only")}>
          <AppLogo href="/dashboard" className="w-fit rounded-2xl bg-white/95 px-2.5 py-1.5 shadow-lg" imageClassName="h-8" />
          <div className="pl-11 text-[11px] font-medium uppercase tracking-[0.22em] text-white/45">SaaS Solutions</div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-9 w-9 rounded-2xl p-0 text-white/70 hover:bg-white/10 hover:text-white", collapsed && "rotate-180")}
          onClick={() => setCollapsed((v) => !v)}
          aria-label="Toggle sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      <Separator className="bg-white/10" />
      <div className={cn("min-h-0 flex-1 overflow-y-auto py-2", collapsed && "px-1")}>
        <SidebarNav variant="sidebar" collapsed={collapsed} permissions={permissions} isSuperAdmin={isSuperAdmin} />
      </div>
      <div className="border-t border-white/10 px-3 py-3">
        <div className={cn("mb-3", collapsed && "hidden")}>
          {isSuperAdmin || permissions.includes(PERMISSIONS.sales_write) ? (
            <Button asChild className="h-12 w-full justify-start gap-2 rounded-2xl bg-primary shadow-lg shadow-primary/25">
              <Link href="/pos" prefetch>
                <Plus className="h-4 w-4" />
                New Transaction
              </Link>
            </Button>
          ) : null}
        </div>
        <div className="grid gap-1">
          <Button variant="ghost" className={cn("h-11 justify-start gap-2 rounded-2xl text-white/70 hover:bg-white/10 hover:text-white", collapsed && "justify-center px-2")}>
            <HelpCircle className="h-4 w-4" />
            <span className={cn(collapsed && "sr-only")}>Help Center</span>
          </Button>
          <Button asChild variant="ghost" className={cn("h-11 justify-start gap-2 rounded-2xl text-white/70 hover:bg-white/10 hover:text-white", collapsed && "justify-center px-2")}>
            <Link href="/api/auth/signout">
              <LogOut className="h-4 w-4" />
              <span className={cn(collapsed && "sr-only")}>Logout</span>
            </Link>
          </Button>
        </div>
      </div>
    </aside>
  );
}
