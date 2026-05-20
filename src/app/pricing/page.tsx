import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getActivePlans } from "@/modules/plans/service";

export const dynamic = "force-dynamic";

function rupiah(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  const n = Number.isFinite(num) ? num : 0;
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
}

function planFeatures(slug: string) {
  if (slug === "starter") {
    return ["Hingga 100 transaksi/bulan", "Manajemen Produk (50 item)", "Laporan Penjualan Dasar", "1 Akun Kasir"];
  }
  if (slug === "pro") {
    return ["Transaksi Tak Terbatas", "Manajemen Stok Real-time", "Analitik & Prediksi Penjualan", "Integrasi E-wallet & QRIS", "Hingga 5 Outlet & Multi-kasir"];
  }
  if (slug === "enterprise") {
    return ["Semua Fitur Paket Pro", "Dedicated Account Manager", "Integrasi API Kustom", "SLA Dukungan 24/7"];
  }
  return ["POS & Inventory", "Reports", "Multi-user"];
}

function PlanCard({
  name,
  slug,
  currency,
  priceMonthly,
  isPopular,
  trialDays,
}: {
  name: string;
  slug: string;
  currency: string;
  priceMonthly: unknown;
  isPopular: boolean;
  trialDays: number;
}) {
  const p = typeof priceMonthly === "number" ? priceMonthly : Number(priceMonthly);
  const isFree = Number.isFinite(p) && p === 0;
  const isCustom = slug === "enterprise";
  const features = planFeatures(slug);
  const priceLabel = currency === "IDR" ? `Rp ${rupiah(p)}` : `${currency} ${p}`;

  return (
    <div className="relative">
      {isPopular ? (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow">
          PALING POPULER
        </div>
      ) : null}
      <Card className={`rounded-3xl ${isPopular ? "border-primary/50 shadow-[0_30px_70px_rgba(2,6,23,0.10)]" : ""}`}>
        <CardContent className="grid gap-6 p-7">
          <div className="grid gap-1">
            <div className="text-base font-semibold">{name}</div>
            <div className="mt-2">
              {isCustom ? (
                <div className="text-3xl font-semibold tracking-tight">Custom</div>
              ) : (
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-semibold tracking-tight">{isFree ? "Free" : priceLabel}</div>
                  <div className="text-sm text-muted-foreground">{isFree ? "/selamanya" : "/bulan"}</div>
                </div>
              )}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {trialDays > 0 ? `Free trial ${trialDays} hari • Cancel anytime` : "Tanpa trial"}
            </div>
          </div>

          <ul className="grid gap-3 text-sm">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          {isCustom ? (
            <Button asChild variant="outline" className="h-11 rounded-xl bg-[hsl(var(--sidebar))] text-white hover:bg-black/90 hover:text-white">
              <Link href="/register?plan=enterprise">Hubungi Tim Sales</Link>
            </Button>
          ) : (
            <Button asChild className={`h-11 rounded-xl ${isPopular ? "" : "bg-primary"}`}>
              <Link href={`/register?plan=${encodeURIComponent(slug)}`}>{isFree ? "Pilih Paket Starter" : "Berlangganan Sekarang"}</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default async function PricingPage() {
  const plans = await getActivePlans().catch(() => []);

  // Ensure consistent order for UI
  const order = new Map([
    ["starter", 1],
    ["pro", 2],
    ["enterprise", 3],
  ]);
  const sorted = [...plans].sort((a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99));

  return (
    <div className="min-h-screen bg-app">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-grid" />
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <section className="text-center">
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Pilih Paket yang Sesuai dengan Skala Bisnis Anda
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
            Kelola transaksi, inventaris, dan laporan bisnis Anda dengan lebih efisien menggunakan solusi POS yang tepat.
          </p>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-3">
          {sorted.length === 0 ? (
            <Card className="rounded-3xl lg:col-span-3">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Paket belum tersedia. Jalankan migrasi &amp; seed database agar paket tampil di halaman ini.
              </CardContent>
            </Card>
          ) : (
            sorted.map((p) => (
              <PlanCard
                key={p.id}
                name={p.name}
                slug={p.slug}
                currency={p.currency}
                priceMonthly={p.priceMonthly}
                isPopular={p.isPopular}
                trialDays={p.trialDays}
              />
            ))
          )}
        </section>

        <section className="mt-16 grid items-center gap-6 rounded-[36px] bg-muted/20 p-8 lg:grid-cols-2">
          <div className="grid gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">Keamanan Data adalah Prioritas Kami</h2>
            <p className="text-sm text-muted-foreground">
              Kami menggunakan enkripsi tingkat bank dan infrastruktur cloud yang aman untuk memastikan seluruh data transaksi bisnis Anda terlindungi setiap saat.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                ISO 27001 Certified
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                SSL Encrypted
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border bg-background">
            <Image
              src="/landing-dashboard.svg"
              alt="Security infrastructure"
              width={1200}
              height={800}
              className="h-[220px] w-full object-cover opacity-90"
            />
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-center text-2xl font-semibold tracking-tight">Pertanyaan yang Sering Diajukan</h2>
          <div className="mx-auto mt-8 grid max-w-3xl gap-3">
            {[
              {
                q: "Apakah saya bisa ganti paket di tengah periode langganan?",
                a: "Ya, Anda dapat melakukan upgrade paket kapan saja. Biaya akan dihitung secara pro-rata berdasarkan sisa hari di periode berjalan.",
              },
              {
                q: "Bagaimana keamanan data transaksi saya jika cloud down?",
                a: "POS Pro memiliki fitur 'Offline Mode' yang memungkinkan Anda tetap bertransaksi meski koneksi internet terputus. Data akan disinkronisasi otomatis begitu koneksi kembali pulih.",
              },
              {
                q: "Apakah ada biaya tambahan untuk update fitur di masa depan?",
                a: "Tidak. Seluruh update fitur di paket yang Anda pilih akan diberikan secara gratis sebagai bagian dari layanan berlangganan SaaS kami.",
              },
              {
                q: "Metode pembayaran apa saja yang didukung?",
                a: "Kami mendukung transfer bank, kartu kredit, dan berbagai e-wallet populer seperti GoPay, OVO, dan Dana.",
              },
            ].map((x) => (
              <details key={x.q} className="group rounded-2xl border bg-background p-5">
                <summary className="cursor-pointer list-none text-sm font-medium">
                  <span className="flex items-center justify-between gap-4">
                    {x.q}
                    <span className="text-muted-foreground transition-transform group-open:rotate-180">⌄</span>
                  </span>
                </summary>
                <div className="mt-3 text-sm text-muted-foreground">{x.a}</div>
              </details>
            ))}
          </div>
        </section>

        <footer className="mt-16 border-t py-10">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
            <div>
              <div className="font-semibold text-foreground">POS Pro</div>
              <div className="mt-1 text-xs">© {new Date().getFullYear()} POS Pro. All rights reserved.</div>
            </div>
            <div className="flex flex-wrap gap-6 text-xs">
              {["Privacy Policy", "Terms of Service", "Contact Us", "Documentation"].map((x) => (
                <Link key={x} href="/" className="hover:text-foreground">
                  {x}
                </Link>
              ))}
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
