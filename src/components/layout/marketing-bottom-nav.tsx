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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/88 shadow-[0_-18px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl md:hidden">
      <div className="mx-auto grid max-w-6xl grid-cols-5 px-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {items.map((it) => {
          const active = it.href === "/" ? pathname === "/" : pathname === it.href || pathname.startsWith(`${it.href}/`);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-[11px] font-bold tracking-[-0.01em]",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-2xl transition",
                  active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-transparent"
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="truncate">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
