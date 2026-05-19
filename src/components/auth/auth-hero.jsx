import Image from "next/image";
import { BarChart3, Boxes, Cloud, CreditCard, ShieldCheck, Users } from "lucide-react";

function FeatureCard({ icon: Icon, title, desc }) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur">
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
    <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur">
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
    <div className="relative min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600 via-blue-700 to-blue-900 text-white">
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.04),rgba(0,0,0,0.35))]" />

      <div className="absolute inset-0 opacity-25">
        <Image src="/landing-dashboard.svg" alt="" fill className="object-cover object-center" priority={false} />
      </div>

      <div className="relative flex h-full flex-col justify-between p-12">
        <div className="text-sm font-semibold tracking-tight">PointPro POS</div>

        {isRegister ? (
          <div className="max-w-xl">
            <div className="text-5xl font-semibold leading-tight">
              Kelola Transaksi Dengan Presisi
              <br />
              Dan Kecepatan Tinggi.
            </div>
            <p className="mt-6 max-w-lg text-white/80">
              Bergabunglah dengan ribuan pengusaha yang telah beralih ke PointPro untuk operasional bisnis yang lebih
              cerdas dan terintegrasi.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <FeatureCard icon={BarChart3} title="Laporan Real-time" desc="Pantau performa penjualan Anda dari mana saja." />
              <FeatureCard icon={Boxes} title="Manajemen Stok" desc="Kontrol inventaris secara otomatis dan akurat." />
              <FeatureCard icon={Users} title="Manajemen Tim" desc="Atur hak akses staf dengan mudah dan aman." />
              <FeatureCard icon={Cloud} title="Akses Cloud" desc="Data tersinkronisasi aman di server enterprise." />
            </div>
          </div>
        ) : (
          <div className="max-w-xl">
            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/20 bg-white/10">
              <CreditCard className="h-7 w-7" />
            </div>

            <div className="mt-8 text-5xl font-semibold leading-tight">
              Kelola Bisnis Lebih Cerdas
              <br />
              dengan PointPro.
            </div>
            <p className="mt-6 max-w-lg text-white/80">
              Platform POS SaaS terintegrasi untuk membantu Anda memantau transaksi, stok inventaris, dan laporan
              keuangan secara real-time dalam satu dashboard yang efisien.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <Pill icon={CreditCard} title="Transaksi Cepat" />
              <Pill icon={ShieldCheck} title="Data Terenkripsi" />
            </div>
          </div>
        )}

        <div className="text-xs text-white/70">
          {"\u00A9"} {year} PointPro SaaS POS. Secured with Enterprise Encryption.
        </div>
      </div>
    </div>
  );
}
