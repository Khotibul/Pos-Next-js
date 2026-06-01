"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppLogo } from "@/components/brand/app-logo";
import { cn } from "@/lib/utils";
import { SUPER_ADMIN_NAV } from "@/components/super-admin/nav";

export function SuperAdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-72 border-r border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,0.28),transparent_34%),linear-gradient(180deg,hsl(var(--sidebar)),hsl(var(--sidebar)/0.96))] text-[hsl(var(--sidebar-foreground))] shadow-2xl shadow-slate-950/10 md:flex md:flex-col">
      <div className="flex h-16 items-center px-5">
        <div className="grid leading-tight">
          <AppLogo href="/super-admin" className="w-fit rounded-2xl bg-white/95 px-2.5 py-1.5 shadow-lg" imageClassName="h-8" />
          <div className="pl-11 text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">Super Admin</div>
        </div>
      </div>

      <nav className="grid gap-1.5 px-3 py-3">
        {SUPER_ADMIN_NAV.map((item) => {
          const Icon = item.icon;
          const match = item.href;
          const active = pathname === match || pathname.startsWith(`${match}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold tracking-[-0.01em] transition-all",
                active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "text-white/75 hover:bg-white/10 hover:text-white"
              )}
            >
              <span className={cn("grid h-8 w-8 place-items-center rounded-xl", active ? "bg-white/15" : "bg-white/5")}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/10 px-3 py-3">
        <Link className="block rounded-2xl px-3 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white" href="/dashboard">
          Kembali ke Dashboard
        </Link>
        <Link className="block rounded-2xl px-3 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white" href="/api/auth/signout">
          Logout
        </Link>
      </div>
    </aside>
  );
}
