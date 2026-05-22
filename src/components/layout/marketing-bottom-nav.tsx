"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sparkles, Tags, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/features", label: "Features", icon: Sparkles },
  { href: "/pricing", label: "Pricing", icon: Tags },
  { href: "/about", label: "About", icon: Info },
] as const;

export function MarketingBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/85 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-6xl grid-cols-4 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {items.map((it) => {
          const active = it.href === "/" ? pathname === "/" : pathname === it.href || pathname.startsWith(`${it.href}/`);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-medium",
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
    </nav>
  );
}

