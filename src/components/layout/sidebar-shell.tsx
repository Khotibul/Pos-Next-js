"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, HelpCircle, LogOut, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { PERMISSIONS } from "@/lib/permissions-keys";

export function SidebarShell({ permissions, isSuperAdmin }: { permissions: string[]; isSuperAdmin: boolean }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden border-r bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] md:flex md:flex-col",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between px-4">
        <div className={cn("grid leading-tight", collapsed && "sr-only")}>
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
            POS Pro
          </Link>
          <div className="text-xs text-white/60">SaaS Solutions</div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-9 w-9 p-0 text-white/80 hover:text-white", collapsed && "rotate-180")}
          onClick={() => setCollapsed((v) => !v)}
          aria-label="Toggle sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      <Separator />
      <div className={cn(collapsed && "px-1")}>
        <SidebarNav collapsed={collapsed} permissions={permissions} isSuperAdmin={isSuperAdmin} />
      </div>
      <div className="mt-auto px-3 pb-3">
        <div className={cn("mb-3", collapsed && "hidden")}>
          {isSuperAdmin || permissions.includes(PERMISSIONS.sales_write) ? (
            <Button asChild className="w-full justify-start gap-2">
              <Link href="/pos">
                <Plus className="h-4 w-4" />
                New Transaction
              </Link>
            </Button>
          ) : null}
        </div>
        <div className="grid gap-1">
          <Button variant="ghost" className={cn("justify-start gap-2 text-white/80 hover:text-white", collapsed && "justify-center px-2")}>
            <HelpCircle className="h-4 w-4" />
            <span className={cn(collapsed && "sr-only")}>Help Center</span>
          </Button>
          <Button asChild variant="ghost" className={cn("justify-start gap-2 text-white/80 hover:text-white", collapsed && "justify-center px-2")}>
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
