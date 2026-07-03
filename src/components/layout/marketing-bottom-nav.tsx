"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, Home, Info, Sparkles, Tags } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/features", label: "Fitur", icon: Sparkles },
  { href: "/pricing", label: "Harga", icon: Tags },
  { href: "/download", label: "App", icon: Download },
  { href: "/about", label: "Tentang", icon: Info },
] as const;

export function MarketingBottomNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/88 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-2xl md:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 pb-[max(0.375rem,env(safe-area-inset-bottom))] pt-1.5">
        {items.map((it) => {
          const active = it.href === "/" ? pathname === "/" : pathname === it.href || pathname.startsWith(`${it.href}/`);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-2.5 py-1 text-[10px] font-semibold leading-tight tracking-[-0.015em] transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "grid place-items-center rounded-xl transition-colors h-8 w-8",
                  active ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "bg-transparent"
                )}
              >
                <Icon className="h-[16px] w-[16px]" />
              </span>
              <span className="w-full truncate text-center">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
