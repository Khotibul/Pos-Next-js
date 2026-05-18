import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-2">
        <div className="relative hidden overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600 via-blue-700 to-blue-900 lg:block">
          <div className="absolute inset-0 opacity-15" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.05),rgba(0,0,0,0.35))]" />
          <div className="relative flex h-full flex-col justify-between p-12 text-white">
            <div className="text-sm font-semibold tracking-tight">POS Pro</div>
            <div className="max-w-xl">
              <div className="text-5xl font-semibold leading-tight">
                Kelola Bisnis Lebih Cerdas
                <br />
                dengan POS Pro.
              </div>
              <p className="mt-6 max-w-lg text-white/80">
                Platform POS SaaS terintegrasi untuk membantu Anda memantau transaksi, stok inventaris, dan laporan
                keuangan secara real-time dalam satu dashboard yang efisien.
              </p>
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/20 bg-white/10 p-5">
                  <div className="text-sm font-semibold">Transaksi Cepat</div>
                  <div className="mt-1 text-sm text-white/80">POS screen cepat dan responsif.</div>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/10 p-5">
                  <div className="text-sm font-semibold">Data Terenkripsi</div>
                  <div className="mt-1 text-sm text-white/80">Keamanan tenant + audit log.</div>
                </div>
              </div>
            </div>
            <div className="text-xs text-white/70">© {new Date().getFullYear()} POS Pro SaaS POS. Enterprise Ready.</div>
          </div>
        </div>

        <div className="flex flex-col">
          <header className="flex items-center justify-between px-6 py-5">
            <Link href="/" className="text-lg font-semibold tracking-tight text-primary">
              POS Pro
            </Link>
            <div className="text-sm text-muted-foreground">
              Sudah punya akun?{" "}
              <Link className="font-medium text-primary" href="/login">
                Masuk
              </Link>
            </div>
          </header>
          <main className="flex flex-1 items-center justify-center px-6 py-10">{children}</main>
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t px-6 py-4 text-xs text-muted-foreground">
            <div>Secured with enterprise encryption.</div>
            <div className="flex gap-4">
              <Link href="#" className="hover:text-foreground">
                Terms
              </Link>
              <Link href="#" className="hover:text-foreground">
                Privacy
              </Link>
              <Link href="#" className="hover:text-foreground">
                Support
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

