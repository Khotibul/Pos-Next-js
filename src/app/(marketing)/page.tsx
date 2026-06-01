import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Eye, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppLogo } from "@/components/brand/app-logo";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 lg:pt-12">
      <section className="grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="grid gap-6">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-background/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Best POS Solution untuk Retail Modern
          </div>
          <h1 className="text-balance text-[2.65rem] font-black leading-[1.03] tracking-[-0.06em] sm:text-6xl">
            Kelola Bisnis Lebih Cerdas dengan <span className="text-primary">POS Pro</span>
          </h1>
          <p className="max-w-xl text-pretty text-base leading-7 text-muted-foreground">
            Solusi manajemen transaksi untuk UMKM hingga Enterprise. Tingkatkan efisiensi operasional dan pantau
            performa bisnis Anda secara real-time dari mana saja.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="h-12 rounded-2xl px-5 font-semibold shadow-lg shadow-primary/20">
              <Link href="/register?plan=pro">Start Free Trial</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 rounded-2xl px-5 font-semibold">
              <Link href="/pricing">Watch Demo</Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: <Zap className="h-4 w-4 text-primary" />, label: "Transaksi Cepat" },
              { icon: <ShieldCheck className="h-4 w-4 text-primary" />, label: "Data Terenkripsi" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-3xl border bg-background/75 p-4 text-sm shadow-sm backdrop-blur">
                <div className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10">{item.icon}</div>
                <div className="font-semibold">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[40px] bg-gradient-to-tr from-primary/25 via-sky-400/10 to-transparent blur-2xl" />
          <div className="overflow-hidden rounded-[32px] border bg-background/85 shadow-[0_30px_80px_rgba(2,6,23,0.14)] backdrop-blur">
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
        <div className="text-center text-xs font-bold tracking-[0.24em] text-muted-foreground">
          TRUSTED BY 10,000+ BUSINESSES WORLDWIDE
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 text-center text-sm text-muted-foreground sm:grid-cols-5">
          {["LUMINA", "VELOCITY", "ACME CORP", "ECHO RETAIL", "MODERN CO"].map((brand) => (
            <div key={brand} className="rounded-2xl border bg-background/75 py-4 font-semibold shadow-sm backdrop-blur">
              {brand}
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mt-16">
        <div className="text-center">
          <h2 className="text-2xl font-black tracking-[-0.04em] sm:text-3xl">Fitur Utama untuk Keunggulan Bisnis</h2>
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
          ].map((feature) => (
            <Card key={feature.title} className="rounded-3xl bg-background/80 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-xl">
              <CardContent className="grid gap-4 p-6">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10">{feature.icon}</div>
                <div className="text-lg font-bold tracking-[-0.025em]">{feature.title}</div>
                <ul className="grid gap-2 text-sm text-muted-foreground">
                  {feature.items.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      {item}
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
          <div className="grid gap-6 p-6 lg:grid-cols-2 lg:items-center lg:p-10">
            <div className="rounded-[28px] bg-white/5 p-6">
              <div className="text-sm text-amber-300">★★★★★</div>
              <div className="mt-4 text-balance text-2xl font-bold leading-tight tracking-[-0.04em]">
                “Sejak menggunakan POS Pro, waktu tutup buku harian saya berkurang dari 2 jam menjadi hanya 15 menit.
                Sangat membantu!”
              </div>
              <div className="mt-4 text-sm text-white/70">
                Maya Kusuma
                <br />
                Owner, Brew &amp; Bloom Coffee
              </div>
              <div className="mt-6 flex items-center gap-2">
                {["‹", "›"].map((label) => (
                  <button
                    type="button"
                    key={label}
                    className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5 hover:bg-white/10"
                    aria-label={label === "‹" ? "Prev" : "Next"}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-8">
                <div className="text-sm text-white/60">Performance snapshot</div>
                <div className="mt-6 grid gap-3">
                  {["Omzet harian naik", "Stok lebih terkontrol", "Rekonsiliasi lebih cepat"].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="h-2 w-2 rounded-full bg-emerald-400" />
                      <div className="text-sm">{item}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-16">
        <div className="rounded-[40px] bg-primary px-6 py-12 text-center text-primary-foreground shadow-2xl shadow-primary/20 sm:px-10">
          <h3 className="text-balance text-3xl font-black tracking-[-0.05em] sm:text-4xl">
            Siap Untuk Membawa Bisnis Anda ke Level Berikutnya?
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-primary-foreground/80">
            Bergabunglah dengan ribuan pengusaha yang telah sukses bertransformasi digital bersama POS Pro.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild variant="secondary" className="h-12 rounded-2xl px-5 font-semibold">
              <Link href="/register?plan=pro">Start 14-Day Free Trial</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 rounded-2xl border-white/20 bg-transparent px-5 font-semibold text-white hover:bg-white/10 hover:text-white">
              <Link href="/pricing">Contact Sales</Link>
            </Button>
          </div>
          <div className="mt-4 text-xs text-primary-foreground/70">No credit card required • Cancel anytime</div>
        </div>
      </section>

      <footer className="mt-16 border-t py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>
            <AppLogo href="/" imageClassName="h-9" />
            <div className="mt-1 text-xs">Solusi POS modern untuk masa depan bisnis yang lebih efisien dan terukur.</div>
          </div>
          <div className="flex flex-wrap gap-6 text-xs">
            {["Privacy Policy", "Terms of Service", "Contact Us", "Documentation"].map((item) => (
              <Link key={item} href="/pricing" className="hover:text-foreground">
                {item}
              </Link>
            ))}
          </div>
          <div className="text-xs">© {new Date().getFullYear()} POS Pro. All rights reserved.</div>
        </div>
      </footer>
    </main>
  );
}
