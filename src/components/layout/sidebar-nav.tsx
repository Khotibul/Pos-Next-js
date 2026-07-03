"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/layout/nav";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { navLabel, type Locale } from "@/lib/i18n";

export function SidebarNav({
  onNavigate,
  collapsed,
  permissions,
  isSuperAdmin,
  variant = "sidebar",
  locale = "id",
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  permissions?: string[];
  isSuperAdmin?: boolean;
  variant?: "sidebar" | "sheet";
  locale?: Locale;
}) {
  const pathname = usePathname() ?? "";
  const permissionSet = useMemo(() => new Set(permissions ?? []), [permissions]);
  const isDesktopApp = typeof window !== "undefined" && Boolean((window as unknown as { posDesktop?: unknown }).posDesktop);

  const sections = useMemo(() => {
    const allowed = (item: (typeof NAV_ITEMS)[number]) => {
      if ("superAdminOnly" in item && item.superAdminOnly && !isSuperAdmin) return false;
      if (isSuperAdmin) return true;
      if (!permissions) return true;
      if (item.href === "/shifts") return true;
      if (isDesktopApp && item.href === "/settings/license") return true;
      return permissionSet.has(item.permission);
    };

    const main = NAV_ITEMS.filter((item) => item.section === "main" && allowed(item));
    const more = NAV_ITEMS.filter((item) => item.section === "more" && allowed(item));
    return [
      { key: "main", label: null, items: main },
      { key: "more", label: "MORE", items: more },
    ] as const;
  }, [isDesktopApp, isSuperAdmin, permissionSet, permissions]);

  const hasMore = sections[1].items.length > 0;
  const labelClass = variant === "sidebar" ? "text-white/40" : "text-muted-foreground";

  const linkClass = (active: boolean) =>
    cn(
      "group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12.5px] font-semibold tracking-[-0.01em] transition-all duration-150",
      variant === "sheet" && "gap-2 rounded-lg px-2 py-1.5 text-xs",
      active
        ? variant === "sidebar"
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
          : "bg-primary text-primary-foreground shadow-md shadow-primary/20"
        : variant === "sidebar"
          ? "text-white/70 hover:bg-white/10 hover:text-white"
          : "text-foreground/75 hover:bg-muted/70 hover:text-foreground",
      collapsed && "justify-center px-1.5"
    );

  const iconClass = (active: boolean) =>
    cn(
      "grid shrink-0 place-items-center rounded-lg transition-colors",
      variant === "sheet" ? "h-6 w-6 rounded-md" : "h-7 w-7",
      active ? "bg-white/15" : variant === "sidebar" ? "bg-white/5 group-hover:bg-white/10" : "bg-muted group-hover:bg-background"
    );

  const iconSize = variant === "sheet" ? "h-3 w-3" : "h-3.5 w-3.5";

  const content = (
    <nav className={cn("grid gap-1 px-1.5 py-2", variant === "sheet" && "gap-0.5 px-2 py-1.5")}>
      {sections.map((section) =>
        section.items.length > 0 ? (
          <div key={section.key} className="grid gap-0.5">
            {section.label && !collapsed ? (
              <div className={cn("px-2.5 pb-1 pt-2 text-[9px] font-bold tracking-[0.24em]", variant === "sheet" && "px-2 pt-1.5 text-[8px]", labelClass)}>
                {section.label}
              </div>
            ) : null}
            {section.items.map((item) => {
              const Icon = item.icon;
              const match = ("match" in item && typeof item.match === "string" ? item.match : item.href) as string;
              const active = pathname === match || pathname === item.href || pathname.startsWith(`${match}/`);
              const label = navLabel(item.label, locale);
              const link = (
                <Link href={item.href} prefetch onClick={onNavigate} className={linkClass(active)}>
                  <span className={iconClass(active)}>
                    <Icon className={iconSize} />
                  </span>
                  <span className={cn("truncate", collapsed && "sr-only")}>{label}</span>
                </Link>
              );

              if (!collapsed || variant === "sheet") return <div key={item.href}>{link}</div>;

              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">{label}</TooltipContent>
                </Tooltip>
              );
            })}
            {section.key === "main" && hasMore ? (
              <div className={cn("my-1.5 h-px", variant === "sidebar" ? "bg-white/10" : "bg-border")} />
            ) : null}
          </div>
        ) : null
      )}
    </nav>
  );

  if (collapsed && variant === "sidebar") {
    return <TooltipProvider delayDuration={200}>{content}</TooltipProvider>;
  }

  return content;
}
