"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SUPER_ADMIN_NAV } from "@/components/super-admin/nav";

export function SuperAdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-72 border-r bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] md:flex md:flex-col">
      <div className="flex h-16 items-center px-5">
        <div className="grid leading-tight">
          <Link href="/super-admin" className="text-lg font-semibold tracking-tight">
            POS Pro
          </Link>
          <div className="text-xs text-white/60">Super Admin</div>
        </div>
      </div>

      <nav className="grid gap-1 px-3 py-3">
        {SUPER_ADMIN_NAV.map((item) => {
          const Icon = item.icon;
          const match = item.href;
          const active = pathname === match || pathname.startsWith(`${match}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/10 px-3 py-3">
        <Link className="block rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white" href="/dashboard">
          Kembali ke Dashboard
        </Link>
        <Link className="block rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white" href="/api/auth/signout">
          Logout
        </Link>
      </div>
    </aside>
  );
}

