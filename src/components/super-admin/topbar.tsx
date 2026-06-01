"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AppLogo } from "@/components/brand/app-logo";
import { SUPER_ADMIN_NAV } from "@/components/super-admin/nav";
import { SuperAdminUserMenu } from "@/components/super-admin/user-menu";
import { cn } from "@/lib/utils";

export function SuperAdminTopbar({
  user,
}: {
  user: { name: string | null; email: string | null; image?: string | null };
}) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between gap-3 border-b bg-background/82 px-3 shadow-sm shadow-slate-950/5 backdrop-blur-xl sm:px-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-10 w-10 rounded-2xl p-0 md:hidden" aria-label="Open super admin menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-[360px] max-w-[94vw] flex-col overflow-hidden p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Super Admin Menu</SheetTitle>
            </SheetHeader>
            <div className="bg-[radial-gradient(circle_at_10%_0%,rgba(37,99,235,0.32),transparent_42%),linear-gradient(135deg,hsl(var(--sidebar)),hsl(var(--sidebar)/0.94))] px-4 pb-5 pt-4 text-white">
              <AppLogo href="/super-admin" className="w-fit rounded-2xl bg-white/95 px-3 py-2 shadow-lg" imageClassName="h-9" />
              <div className="pl-12 text-[10px] font-bold uppercase tracking-[0.22em] text-white/50">Super Admin</div>
            </div>
            <nav className="grid gap-1.5 px-3 py-4">
              {SUPER_ADMIN_NAV.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition",
                      active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span className={cn("grid h-8 w-8 place-items-center rounded-xl", active ? "bg-white/15" : "bg-muted")}>
                      <Icon className="h-4 w-4" />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
        <div className="min-w-0">
          <div className="truncate text-base font-black tracking-[-0.045em] text-primary sm:text-lg">Super Admin SaaS</div>
          <div className="-mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Control Center</div>
        </div>
      </div>

      <div className="hidden flex-1 px-4 md:block">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-12 w-full rounded-2xl border bg-muted/35 px-10 text-sm font-medium outline-none ring-offset-background transition focus:border-primary/40 focus:bg-background focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Cari tenant, user, atau invoice..."
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <SuperAdminUserMenu name={user.name} email={user.email} image={user.image ?? null} />
      </div>
    </header>
  );
}
