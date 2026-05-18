"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export function MobileNav({ permissions, isSuperAdmin }: { permissions: string[]; isSuperAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="md:hidden" aria-label="Open menu">
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0">
        <div className="flex h-14 items-center px-4 font-semibold">POS SaaS</div>
        <Separator />
        <SidebarNav onNavigate={() => setOpen(false)} permissions={permissions} isSuperAdmin={isSuperAdmin} />
      </SheetContent>
    </Sheet>
  );
}
