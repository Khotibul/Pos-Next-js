import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Eye, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 pb-28 pt-10">
        <section className="grid items-center gap-10 lg:grid-cols-2">
          <div className="grid gap-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Best POS solution for 2024
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Kelola Bisnis Lebih Cerdas dengan <span className="text-primary">POS Pro</span>
            </h1>
            <p className="max-w-xl text-pretty text-muted-foreground">
              Solusi manajemen transaksi tercanggih untuk UMKM hingga Enterprise. Tingkatkan efisiensi operasional dan
              pantau performa bisnis Anda secara real-time dari mana saja.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-xl">
                <Link href="/register?plan=pro">Start Free Trial</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/pricing">Watch Demo</Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: <Zap className="h-4 w-4 text-primary" />, label: "Transaksi Cepat" },
                { icon: <ShieldCheck className="h-4 w-4 text-primary" />, label: "Data Terenkripsi" },
              ].map((x) => (
                <div key={x.label} className="flex items-center gap-2 rounded-2xl border bg-background p-4 text-sm">
                  <div className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10">{x.icon}</div>
                  <div className="font-medium">{x.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[40px] bg-gradient-to-tr from-primary/20 via-transparent to-transparent blur-2xl" />
            <div className="overflow-hidden rounded-[32px] border bg-background shadow-[0_30px_70px_rgba(2,6,23,0.12)]">
              <Image
                src="/landing-dashboard.svg"
                alt="POS Pro dashboard preview"
                width={1200}
                height={800}
                priority
                className="h-auto w-full"
              />
            </div>
          </div>
        </section>

        <section className="mt-14">
          <div className="text-center text-xs tracking-wider text-muted-foreground">TRUSTED BY 10,000+ BUSINESSES WORLDWIDE</div>
          <div className="mt-6 grid grid-cols-2 gap-4 text-center text-sm text-muted-foreground sm:grid-cols-5">
            {["LUMINA", "VELOCITY", "ACME CORP", "ECHO RETAIL", "MODERN CO"].map((b) => (
              <div key={b} className="rounded-2xl border bg-background py-4 font-medium">
                {b}
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="mt-16">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Fitur Utama untuk Keunggulan Bisnis</h2>
            <p className="mt-2 text-sm text-muted-foreground">Dirancang untuk kecepatan dan presisi operasional harian Anda.</p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {[
              {
                title: "Real-time Reports",
                icon: <Eye className="h-5 w-5 text-primary" />,
                items: ["Visualisasi Data Interaktif", "Export PDF/CSV Otomatis"],
              },
              {
                title: "Smart Inventory",
                icon: <Zap className="h-5 w-5 text-primary" />,
                items: ["Tracking Batch & Expired", "Multi-Warehouse Support"],
              },
              {
                title: "Cloud Sync",
                icon: <ShieldCheck className="h-5 w-5 text-primary" />,
                items: ["Offline Mode Transaction", "256-bit Encryption"],
              },
            ].map((f) => (
              <Card key={f.title} className="rounded-3xl">
                <CardContent className="grid gap-4 p-6">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10">{f.icon}</div>
                  <div className="text-lg font-semibold">{f.title}</div>
                  <ul className="grid gap-2 text-sm text-muted-foreground">
                    {f.items.map((i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        {i}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <div className="overflow-hidden rounded-[36px] bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]">
            <div className="grid gap-6 p-8 lg:grid-cols-2 lg:items-center lg:p-10">
              <div className="rounded-[28px] bg-white/5 p-6">
                <div className="text-sm text-white/60">★★★★★</div>
                <div className="mt-4 text-balance text-2xl font-semibold leading-tight">
                  “Sejak menggunakan POS Pro, waktu tutup buku harian saya berkurang dari 2 jam menjadi hanya 15 menit. Sangat membantu!”
                </div>
                <div className="mt-4 text-sm text-white/70">
                  Maya Kusuma<br />
                  Owner, Brew &amp; Bloom Coffee
                </div>
                <div className="mt-6 flex items-center gap-2">
                  <button
                    type="button"
                    className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5 hover:bg-white/10"
                    aria-label="Prev"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5 hover:bg-white/10"
                    aria-label="Next"
                  >
                    ›
                  </button>
                </div>
              </div>

              <div className="hidden lg:block">
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-8">
                  <div className="text-sm text-white/60">Performance snapshot</div>
                  <div className="mt-6 grid gap-3">
                    {["Omzet harian naik", "Stok lebih terkontrol", "Rekonsiliasi lebih cepat"].map((t) => (
                      <div key={t} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="h-2 w-2 rounded-full bg-emerald-400" />
                        <div className="text-sm">{t}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16">
          <div className="rounded-[40px] bg-primary px-6 py-12 text-center text-primary-foreground sm:px-10">
            <h3 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Siap Untuk Membawa Bisnis Anda ke Level Berikutnya?
            </h3>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-primary-foreground/80">
              Bergabunglah dengan ribuan pengusaha yang telah sukses bertransformasi digital bersama POS Pro.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild variant="secondary" className="rounded-xl">
                <Link href="/register?plan=pro">Start 14-Day Free Trial</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-xl border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/pricing">Contact Sales</Link>
              </Button>
            </div>
            <div className="mt-4 text-xs text-primary-foreground/70">No credit card required • Cancel anytime</div>
          </div>
        </section>

        <footer className="mt-16 border-t py-10">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
            <div>
              <div className="font-semibold text-foreground">POS Pro</div>
              <div className="mt-1 text-xs">Solusi POS modern untuk masa depan bisnis yang lebih efisien dan terukur.</div>
            </div>
            <div className="flex flex-wrap gap-6 text-xs">
              {["Privacy Policy", "Terms of Service", "Contact Us", "Documentation"].map((x) => (
                <Link key={x} href="/pricing" className="hover:text-foreground">
                  {x}
                </Link>
              ))}
            </div>
            <div className="text-xs">© {new Date().getFullYear()} POS Pro. All rights reserved.</div>
          </div>
        </footer>
    </main>
  );
}
