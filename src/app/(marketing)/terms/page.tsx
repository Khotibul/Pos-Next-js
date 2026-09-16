export const metadata = {
  title: "Syarat dan Ketentuan | POS Pro",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-10 md:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Syarat dan Ketentuan</h1>
      <p className="mt-3 text-sm text-muted-foreground">Terakhir diperbarui: 16 September 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">1. Penerimaan Syarat</h2>
          <p className="mt-2">
            Dengan menggunakan layanan POS Pro, Anda menyetujui syarat dan ketentuan ini.
            Jika Anda tidak setuju dengan syarat ini, silakan tidak menggunakan layanan kami.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">2. Layanan</h2>
          <p className="mt-2">
            POS Pro menyediakan solusi point-of-sale berbasis cloud untuk pengelolaan transaksi,
            inventaris, dan laporan bisnis. Fitur layanan dapat berubah sewaktu-waktu
            dengan pemberitahuan sebelumnya.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">3. Akun Pengguna</h2>
          <p className="mt-2">
            Anda bertanggung jawab untuk menjaga kerahasiaan akun dan kata sandi Anda.
            Anda harus segera memberi tahu kami jika ada penggunaan akun yang tidak sah.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">4. Pembayaran</h2>
          <p className="mt-2">
            Berlangganan paket berbayar akan ditagih secara berkala sesuai periode yang dipilih.
            Pembatalan dapat dilakukan kapan saja, dan akses akan berakhir pada akhir periode penagihan.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">5. Kekayaan Intelektual</h2>
          <p className="mt-2">
            Seluruh konten, fitur, dan kode sumber POS Pro dilindungi oleh hak cipta
            dan hukum kekayaan intelektual yang berlaku.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">6. Batasan Tanggung Jawab</h2>
          <p className="mt-2">
            Kami tidak bertanggung jawab atas kerugian tidak langsung, insidental, atau konsekuensial
            yang timbul dari penggunaan layanan kami.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">7. Hubungi Kami</h2>
          <p className="mt-2">
            Pertanyaan tentang syarat dan ketentuan ini dapat dikirim ke support@posqupro.co.id.
          </p>
        </section>
      </div>
    </main>
  );
}
