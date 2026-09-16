export const metadata = {
  title: "Hubungi Kami | POS Pro",
};

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-10 md:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Hubungi Kami</h1>
      <p className="mt-3 text-muted-foreground">
        Punya pertanyaan atau butuh bantuan? Jangan ragu untuk menghubungi tim support kami.
      </p>

      <div className="mt-8 space-y-6">
        <div className="rounded-2xl border bg-background/70 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Email</h2>
          <p className="mt-1 text-muted-foreground">support@posqupro.co.id</p>
        </div>

        <div className="rounded-2xl border bg-background/70 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">WhatsApp</h2>
          <p className="mt-1 text-muted-foreground">+62 812-3456-7890</p>
        </div>

        <div className="rounded-2xl border bg-background/70 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Jam Operasional</h2>
          <p className="mt-1 text-muted-foreground">
            Senin - Jumat: 09:00 - 18:00 WIB<br />
            Sabtu: 09:00 - 13:00 WIB
          </p>
        </div>
      </div>
    </main>
  );
}
