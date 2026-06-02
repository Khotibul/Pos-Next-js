"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Boxes, LayoutDashboard, Settings, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  home: LayoutDashboard,
  inventory: Boxes,
  transactions: ShoppingCart,
  reports: BarChart3,
  admin: Settings,
} as const;

export type DashboardIconKey = keyof typeof ICONS;

export type DashboardNavItem = {
  href: string;
  label: string;
  iconKey: DashboardIconKey;
  match?: string | string[];
};

export function DashboardBottomNav({ items }: { items: DashboardNavItem[] }) {
  const pathname = usePathname() ?? "";
  if (items.length === 0) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 shadow-[0_-12px_40px_rgba(15,23,42,0.10)] backdrop-blur-xl md:hidden">
      <div
        className={cn("mx-auto grid max-w-6xl gap-1 px-2 pt-2")}
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((it) => {
          const matchers = Array.isArray(it.match) ? it.match : it.match ? [it.match] : [it.href];
          const active =
            pathname === it.href ||
            matchers.some((m) => pathname === m || pathname.startsWith(`${m}/`) || pathname.startsWith(m));
          const Icon = ICONS[it.iconKey];
          return (
            <Link
              key={it.href}
              href={it.href}
              prefetch
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-[10.5px] font-bold tracking-[-0.01em] transition-all",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              <span className={cn("grid h-9 w-9 place-items-center rounded-2xl transition-transform", active && "scale-105 bg-primary text-primary-foreground shadow-lg shadow-primary/25")}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="w-full truncate text-center">{it.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="pb-[max(0.5rem,env(safe-area-inset-bottom))]" />
    </nav>
  );
}
