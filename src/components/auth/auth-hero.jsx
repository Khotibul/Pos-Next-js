import Image from "next/image";
import { BarChart3, Boxes, Cloud, CreditCard, ShieldCheck, Users } from "lucide-react";

function FeatureCard({ icon: Icon, title, desc }) {
  return (
    <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 shadow-xl shadow-blue-950/10 backdrop-blur-xl">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/10">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-base font-semibold">{title}</div>
          <div className="mt-1 text-sm text-white/80">{desc}</div>
        </div>
      </div>
    </div>
  );
}

function Pill({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 shadow-xl shadow-blue-950/10 backdrop-blur-xl">
      <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white/10">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-sm font-semibold">{title}</div>
    </div>
  );
}

export function AuthHero({ variant }) {
  const year = new Date().getFullYear();
  const isRegister = variant === "register";

  return (
    <div className="relative h-full min-h-screen overflow-hidden bg-[radial-gradient(circle_at_22%_12%,rgba(96,165,250,0.75),transparent_34%),linear-gradient(135deg,#0755f5,#0b56d9_48%,#1e3a8a)] text-white lg:min-h-0">
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),rgba(0,0,0,0.28))]" />
      <div className="pointer-events-none absolute -right-28 -top-24 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-16 h-80 w-80 rounded-full bg-blue-950/35 blur-3xl" />

      <div className="absolute inset-0 opacity-20">
        <Image src="/landing-dashboard.svg" alt="" fill className="object-cover object-center" priority={false} />
      </div>

      <div className="relative flex h-full flex-col justify-between p-8 xl:p-12">
        <div className="flex items-center gap-2 text-sm font-bold tracking-tight">
          <span className="grid h-10 w-10 place-items-center rounded-2xl border border-white/20 bg-white/10">PP</span>
          PointPro POS
        </div>

        {isRegister ? (
          <div className="max-w-2xl">
            <div className="text-4xl font-black leading-[1.08] tracking-[-0.06em] xl:text-6xl">
              Kelola Transaksi Dengan Presisi
              <br />
              Dan Kecepatan Tinggi.
            </div>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/80">
              Bergabunglah dengan ribuan pengusaha yang telah beralih ke PointPro untuk operasional bisnis yang lebih
              cerdas dan terintegrasi.
            </p>

            <div className="mt-10 grid gap-4 xl:grid-cols-2">
              <FeatureCard icon={BarChart3} title="Laporan Real-time" desc="Pantau performa penjualan Anda dari mana saja." />
              <FeatureCard icon={Boxes} title="Manajemen Stok" desc="Kontrol inventaris secara otomatis dan akurat." />
              <FeatureCard icon={Users} title="Manajemen Tim" desc="Atur hak akses staf dengan mudah dan aman." />
              <FeatureCard icon={Cloud} title="Akses Cloud" desc="Data tersinkronisasi aman di server enterprise." />
            </div>
          </div>
        ) : (
          <div className="max-w-2xl">
            <div className="grid h-16 w-16 place-items-center rounded-3xl border border-white/20 bg-white/10 shadow-xl shadow-blue-950/20 backdrop-blur-xl">
              <CreditCard className="h-7 w-7" />
            </div>

            <div className="mt-8 text-4xl font-black leading-[1.08] tracking-[-0.06em] xl:text-6xl">
              Kelola Bisnis Lebih Cerdas
              <br />
              dengan PointPro.
            </div>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/80">
              Platform POS SaaS terintegrasi untuk membantu Anda memantau transaksi, stok inventaris, dan laporan
              keuangan secara real-time dalam satu dashboard yang efisien.
            </p>

            <div className="mt-10 grid gap-4 xl:grid-cols-2">
              <Pill icon={CreditCard} title="Transaksi Cepat" />
              <Pill icon={ShieldCheck} title="Data Terenkripsi" />
            </div>
          </div>
        )}

        <div className="text-xs font-medium tracking-[0.08em] text-white/70">
          {"\u00A9"} {year} PointPro SaaS POS. Secured with Enterprise Encryption.
        </div>
      </div>
    </div>
  );
}
