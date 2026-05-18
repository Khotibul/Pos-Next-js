"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/layout/nav";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function SidebarNav({
  onNavigate,
  collapsed,
  permissions,
  isSuperAdmin,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  permissions?: string[];
  isSuperAdmin?: boolean;
}) {
  const pathname = usePathname();

  const allowed = (item: (typeof NAV_ITEMS)[number]) => {
    if (isSuperAdmin) return true;
    if (!permissions) return true;
    return permissions.includes(item.permission);
  };

  const main = NAV_ITEMS.filter((i) => i.section === "main").filter(allowed);
  const more = NAV_ITEMS.filter((i) => i.section === "more").filter(allowed);

  const sections = [
    { key: "main", label: null, items: main },
    { key: "more", label: "MORE", items: more },
  ] as const;
  return (
    <TooltipProvider delayDuration={200}>
      <nav className="grid gap-1 px-2 py-3">
        {sections.map((section) => (
          section.items.length > 0 ? (
          <div key={section.key} className="grid gap-1">
            {section.label && !collapsed ? (
              <div className="px-3 pt-2 text-[10px] font-semibold tracking-wider text-white/40">{section.label}</div>
            ) : null}
            {section.items.map((item) => {
              const Icon = item.icon;
              const match = ("match" in item && typeof item.match === "string" ? item.match : item.href) as string;
              const active = pathname === match || pathname === item.href || pathname.startsWith(`${match}/`);
              const link = (
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-primary text-primary-foreground" : "text-white/80 hover:bg-white/10 hover:text-white",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
                </Link>
              );

              if (!collapsed) return <div key={item.href}>{link}</div>;

              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            })}
            {section.key === "main" && more.length > 0 ? <div className="my-2 h-px bg-white/10" /> : null}
          </div>
          ) : null
        ))}
      </nav>
    </TooltipProvider>
  );
}
