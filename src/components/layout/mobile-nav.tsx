"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Plus, LogOut, HelpCircle, Search } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
        <Button type="button" variant="ghost" size="sm" className="md:hidden" aria-label="Open menu">
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-[340px] max-w-[92vw] flex-col p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>

        <div className="flex h-16 items-center justify-between px-4">
          <div className="grid leading-tight">
            <div className="text-base font-semibold tracking-tight">POS Pro</div>
            <div className="text-xs text-muted-foreground">SaaS Solutions</div>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="rounded-2xl border bg-background p-3">
            <div className="text-[11px] font-medium text-muted-foreground">Tenant</div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <TenantSwitcher currentTenantId={currentTenantId} options={tenantOptions} />
            </div>
          </div>

          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-11 w-full rounded-full border bg-background px-10 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Cari menu..."
            />
          </div>

          {isSuperAdmin || permissions.includes(PERMISSIONS.sales_write) ? (
            <div className="mt-3">
              <Button asChild className="w-full justify-start gap-2 rounded-xl" onClick={() => setOpen(false)}>
                <Link href="/pos">
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

        <div className="grid gap-1 p-3">
          <Button type="button" variant="ghost" className="justify-start gap-2 rounded-xl" onClick={() => setOpen(false)}>
            <HelpCircle className="h-4 w-4" />
            Help Center
          </Button>
          <Button asChild type="button" variant="ghost" className="justify-start gap-2 rounded-xl">
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
