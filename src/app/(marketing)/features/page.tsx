import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, Boxes, CreditCard, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    title: "Analitik Penjualan Real-time",
    desc: "Pantau performa gerai Anda kapan saja. Visualisasi data transaksi harian, mingguan, hingga laporan laba rugi otomatis.",
    icon: BarChart3,
    cta: "Lihat Demo",
    href: "/register",
  },
  {
    title: "Manajemen Stok Cerdas",
    desc: "Sistem stok otomatis yang memberi peringatan saat barang menipis. Kelola varian produk dan bahan baku dengan presisi tinggi.",
    icon: Boxes,
    cta: "Pelajari Lebih Lanjut",
    href: "/pricing",
  },
  {
    title: "Pembayaran Digital Terintegrasi",
    desc: "Terima QRIS, kartu debit, hingga e-wallet populer. Proses pembayaran lebih cepat dan aman bagi pelanggan Anda.",
    icon: CreditCard,
    cta: "Aktivasi Sekarang",
    href: "/register",
  },
] as const;

export default function FeaturesPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 pb-28 pt-10 sm:pt-12">
      <section className="rounded-[32px] border bg-primary p-6 text-primary-foreground shadow-sm sm:p-8">
        <div className="inline-flex w-fit items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium tracking-wide">
          FITUR UNGGULAN
        </div>
        <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Solusi Digital untuk Bisnis Anda</h1>
        <p className="mt-2 max-w-2xl text-sm text-primary-foreground/85">
          Kelola transaksi, stok, dan pembayaran dalam satu dashboard modern. Desain cepat, responsif, dan siap skala bisnis Anda.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="secondary" className="rounded-xl">
            <Link href="/register">Get Started</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white">
            <Link href="/pricing">Lihat Harga</Link>
          </Button>
        </div>
      </section>

      <section className="mt-8 grid gap-4">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <Card key={f.title} className="overflow-hidden rounded-[28px]">
              <CardContent className="grid gap-4 p-6 sm:grid-cols-[1fr_240px] sm:items-center sm:gap-6">
                <div className="grid gap-2">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="text-lg font-semibold">{f.title}</div>
                  </div>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                  <div className="pt-2">
                    <Button asChild variant="ghost" className="h-10 justify-start gap-2 rounded-xl px-3 text-primary hover:bg-primary/10 hover:text-primary">
                      <Link href={f.href}>
                        {f.cta}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border bg-muted/10 p-2 sm:p-3">
                  <div className="overflow-hidden rounded-xl border bg-background">
                    <Image src="/landing-dashboard.svg" alt="Feature preview" width={800} height={500} className="h-[140px] w-full object-cover opacity-90" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="mt-10 rounded-[32px] border bg-muted/20 p-6 text-center sm:p-8">
        <h2 className="text-balance text-2xl font-semibold tracking-tight">Butuh bantuan memilih?</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
          Tim ahli kami siap membantu menyesuaikan fitur POSify dengan kebutuhan bisnis Anda.
        </p>
        <div className="mt-6 flex justify-center">
          <Button asChild className="h-11 gap-2 rounded-xl">
            <Link href="/about">
              <MessageCircle className="h-4 w-4" />
              Hubungi Kami via WhatsApp
            </Link>
          </Button>
        </div>
      </section>

      <footer className="mt-12 border-t py-10">
        <div className="text-center text-xs text-muted-foreground">© {new Date().getFullYear()} POSify SaaS. All rights reserved.</div>
      </footer>
    </main>
  );
}

