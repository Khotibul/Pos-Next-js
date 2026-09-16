export const metadata = {
  title: "Kebijakan Privasi | POS Pro",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-10 md:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Kebijakan Privasi</h1>
      <p className="mt-3 text-sm text-muted-visible">Terakhir diperbarui: 16 September 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">1. Pengumpulan Informasi</h2>
          <p className="mt-2">
            Kami mengumpulkan informasi yang Anda berikan secara langsung saat mendaftar akun,
            menggunakan layanan kami, atau menghubungi tim support. Informasi ini termasuk nama,
            alamat email, nomor telepon, dan data transaksi bisnis Anda.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">2. Penggunaan Informasi</h2>
          <p className="mt-2">
            Informasi yang kami kumpulkan digunakan untuk menyediakan dan meningkatkan layanan kami,
            memproses transaksi, mengirim notifikasi penting, dan memberikan dukungan teknis.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">3. Keamanan Data</h2>
          <p className="mt-2">
            Kami menggunakan enkripsi 256-bit dan infrastruktur cloud yang aman untuk melindungi
            data Anda. Data transaksi dienkripsi saat disimpan dan saat dikirim.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">4. Berbagi Informasi</h2>
          <p className="mt-2">
            Kami tidak menjual atau menyewakan informasi pribadi Anda kepada pihak ketiga.
            Kami hanya berbagi informasi jika diwajibkan oleh hukum atau untuk melindungi hak kami.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">5. Cookie</h2>
          <p className="mt-2">
            Kami menggunakan cookie untuk meningkatkan pengalaman Anda. Anda dapat mengatur
            preferensi cookie melalui pengaturan browser Anda.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">6. Hubungi Kami</h2>
          <p className="mt-2">
            Jika Anda memiliki pertanyaan tentang Kebijakan Privasi ini, silakan hubungi kami
            di support@posqupro.co.id.
          </p>
        </section>
      </div>
    </main>
  );
}
