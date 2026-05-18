"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export function Sidebar() {
  return (
    <aside className="hidden w-64 border-r bg-background md:block">
      <div className="flex h-14 items-center px-4 font-semibold">POS SaaS</div>
      <Separator />
      <SidebarNav />
    </aside>
  );
}
