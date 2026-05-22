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
  const pathname = usePathname();
  if (items.length === 0) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/85 backdrop-blur md:hidden">
      <div
        className={cn("mx-auto grid max-w-6xl px-2 pt-2")}
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
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className={cn("grid h-9 w-9 place-items-center rounded-2xl", active && "bg-primary/10")}>
                <Icon className="h-5 w-5" />
              </span>
              {it.label}
            </Link>
          );
        })}
      </div>
      <div className="pb-[max(0.5rem,env(safe-area-inset-bottom))]" />
    </nav>
  );
}
