"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useRef, useState, useEffect } from "react";
import {
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/layout/nav";

export function DashboardBottomNav({
  permissions,
  isSuperAdmin,
}: {
  permissions: string[];
  isSuperAdmin: boolean;
}) {
  const pathname = usePathname() ?? "";
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);

  const visibleItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      if ("superAdminOnly" in item && item.superAdminOnly && !isSuperAdmin) return false;
      if (isSuperAdmin) return true;
      if (!permissions) return true;
      return permissionSet.has(item.permission);
    }).slice(0, 12);
  }, [isSuperAdmin, permissionSet, permissions]);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [visibleItems]);

  if (visibleItems.length === 0) return null;

  return (
    <nav
      aria-label="Navigasi mobile"
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
    >
      <div className="relative bg-background/95 border-t border-border/80 backdrop-blur-2xl shadow-[0_-8px_30px_rgba(15,23,42,0.08)]">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollRef.current?.scrollBy({ left: -120, behavior: "smooth" })}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-full w-8 bg-gradient-to-r from-background/95 to-transparent flex items-center justify-start pl-1"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        <div
          ref={scrollRef}
          className="flex items-center gap-0.5 overflow-x-auto scrollbar-thin py-1.5 px-2"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const match = ("match" in item && typeof item.match === "string" ? item.match : item.href) as string;
            const isActive = pathname === match || pathname === item.href || pathname.startsWith(`${match}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                scroll={false}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-3 py-1.5 text-[10px] font-semibold leading-tight tracking-[-0.015em] transition-colors snap-start min-w-[64px] max-w-[80px]",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                <Icon className="mb-0.5 h-[18px] w-[18px]" aria-hidden="true" />
                <span className="w-full truncate text-center">{item.label}</span>
              </Link>
            );
          })}
        </div>
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollRef.current?.scrollBy({ left: 120, behavior: "smooth" })}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-full w-8 bg-gradient-to-l from-background/95 to-transparent flex items-center justify-end pr-1"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </nav>
  );
}
