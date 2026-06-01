"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, Download, Menu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Beranda" },
  { href: "/features", label: "Fitur" },
  { href: "/pricing", label: "Harga" },
  { href: "/download", label: "Download" },
  { href: "/about", label: "Tentang" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/78 shadow-sm shadow-slate-950/[0.03] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-transform group-hover:-rotate-3 group-hover:scale-105">
            PP
          </span>
          <span className="grid leading-none">
            <span className="text-lg font-black tracking-[-0.045em] text-primary sm:text-xl">POS Pro</span>
            <span className="hidden text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground sm:block">SaaS</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-2xl border bg-background/65 p-1 shadow-sm lg:flex">
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                prefetch
                className={cn(
                  "rounded-xl px-3.5 py-2 text-sm font-semibold tracking-[-0.01em] text-muted-foreground transition-all hover:bg-muted/70 hover:text-foreground",
                  active && "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary hover:text-primary-foreground"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm" className="hidden rounded-xl font-semibold lg:inline-flex">
            <Link href="/login">Masuk</Link>
          </Button>
          <Button asChild size="sm" className="h-10 rounded-2xl px-4 font-semibold shadow-lg shadow-primary/20">
            <Link href="/register">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-10 w-10 rounded-2xl p-0 lg:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex w-[360px] max-w-[94vw] flex-col overflow-hidden p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <div className="relative overflow-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,0.36),transparent_46%),linear-gradient(135deg,hsl(var(--sidebar)),hsl(var(--sidebar)/0.93))] px-5 pb-6 pt-5 text-white">
              <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/35 blur-3xl" />
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30">
                  PP
                </span>
                <div className="grid leading-tight">
                  <div className="text-xl font-black tracking-[-0.045em]">POS Pro</div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/55">Retail SaaS</div>
                </div>
              </div>
              <div className="mt-5 rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/65">
                  <Sparkles className="h-3.5 w-3.5" />
                  Siap scale bisnis
                </div>
                <p className="mt-2 text-sm leading-6 text-white/78">POS cloud, desktop, dan mobile untuk outlet modern.</p>
              </div>
            </div>
            <Separator />
            <div className="grid flex-1 content-start gap-1 px-3 py-4">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  prefetch
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-2xl px-4 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground",
                    (l.href === "/" ? pathname === "/" : pathname === l.href || pathname.startsWith(`${l.href}/`)) &&
                      "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary hover:text-primary-foreground"
                  )}
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-3 grid gap-2 px-1">
                <Button asChild className="h-12 w-full rounded-2xl shadow-lg shadow-primary/20">
                  <Link href="/register" onClick={() => setOpen(false)}>
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-12 w-full rounded-2xl">
                  <Link href="/download" onClick={() => setOpen(false)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download App
                  </Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
