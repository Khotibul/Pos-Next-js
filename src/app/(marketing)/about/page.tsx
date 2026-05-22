import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 pb-28 pt-10 sm:pt-12">
      <section className="grid gap-5 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="grid gap-3">
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Tentang Kami</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            POSify adalah platform POS SaaS modern untuk membantu UMKM hingga enterprise mengelola transaksi, inventaris, dan laporan secara real-time.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Button asChild className="rounded-xl">
              <Link href="/register">Mulai Free Trial</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/pricing">Lihat Pricing</Link>
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden rounded-[28px]">
          <CardContent className="p-0">
            <div className="relative">
              <Image src="/landing-dashboard.svg" alt="POSify preview" width={1200} height={800} className="h-[260px] w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="text-sm font-semibold text-white">Memberdayakan bisnis kecil menuju masa depan</div>
                <div className="mt-1 text-xs text-white/80">Solusi POS modern untuk efisiensi operasional tanpa batas.</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card className="rounded-[28px]">
          <CardContent className="grid gap-3 p-6">
            <div className="text-sm font-semibold">Visi Kami</div>
            <div className="text-sm text-muted-foreground">
              Menjadi platform operasional retail &amp; F&amp;B nomor satu di Indonesia yang membantu digitalisasi jutaan UMKM dengan teknologi tercanggih dan termudah.
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px]">
          <CardContent className="grid gap-3 p-6">
            <div className="text-sm font-semibold">Misi Kami</div>
            <ul className="grid gap-2 text-sm text-muted-foreground">
              {[
                "Menyediakan antarmuka yang intuitif bagi staf lapangan yang sibuk.",
                "Memberikan analitik data real-time untuk pengambilan keputusan yang presisi.",
                "Membangun ekosistem pembayaran yang aman dan terintegrasi.",
              ].map((x) => (
                <li key={x} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card className="rounded-[28px]">
          <CardContent className="p-6">
            <div className="text-sm font-semibold">Hubungi Kami</div>
            <form className="mt-4 grid gap-3" method="post" action="/api/public/contact">
              <div className="grid gap-1">
                <label className="text-xs font-medium text-muted-foreground">Nama Lengkap</label>
                <input name="name" required className="h-11 rounded-xl border bg-background px-3 text-sm" placeholder="Masukkan nama Anda" />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-medium text-muted-foreground">Email Bisnis</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="h-11 rounded-xl border bg-background px-3 text-sm"
                  placeholder="nama@perusahaan.com"
                />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-medium text-muted-foreground">Subjek</label>
                <select name="subject" className="h-11 rounded-xl border bg-background px-3 text-sm">
                  <option value="Pertanyaan Umum">Pertanyaan Umum</option>
                  <option value="Demo">Demo</option>
                  <option value="Kerja Sama">Kerja Sama</option>
                  <option value="Support">Support</option>
                </select>
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-medium text-muted-foreground">Pesan</label>
                <textarea name="message" required rows={4} className="rounded-xl border bg-background px-3 py-2 text-sm" placeholder="Apa yang bisa kami bantu?" />
              </div>
              <Button type="submit" className="h-11 rounded-xl">
                Kirim Pesan
              </Button>
              <div className="text-[11px] text-muted-foreground">
                Dengan mengirim pesan, Anda setuju kami menghubungi Anda melalui email.
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="rounded-[28px]">
            <CardContent className="grid gap-3 p-6 text-sm">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <MapPin className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Lokasi</div>
                  <div className="font-medium">Jakarta Selatan, Indonesia</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Mail className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div className="font-medium">hello@posify.com</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Phone className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Telepon</div>
                  <div className="font-medium">+62</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="mt-12 border-t py-10">
        <div className="flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
          <div>POSify SaaS</div>
          <div className="flex items-center gap-4">
            <Link href="/about" className="hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/about" className="hover:text-foreground">
              Terms of Service
            </Link>
          </div>
          <div>© {new Date().getFullYear()} POSify SaaS. All rights reserved.</div>
        </div>
      </footer>
    </main>
  );
}

