import { DownloadCard } from "@/components/download/download-card";
import { QrDownload } from "@/components/download/qr-download";
import { InstallGuide } from "@/components/download/install-guide";
import { ChangelogList } from "@/components/download/changelog-list";
import { getAllReleasesByPlatform, getLatestRelease } from "@/config/downloads";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Monitor, ShieldCheck } from "lucide-react";
import fs from "node:fs";
import path from "node:path";

export const metadata = {
  title: "Download Aplikasi | POS Pro",
};

export default function DownloadPage() {
  const android = getLatestRelease("ANDROID");
  const windows = getLatestRelease("WINDOWS");

  const withLocalFileSize = (r: typeof android) => {
    if (!r) return r;
    if (r.fileSize) return r;
    if (!r.downloadUrl.startsWith("/downloads/")) return r;
    try {
      const rel = r.downloadUrl.replace(/^\//, "");
      const p = path.join(process.cwd(), "public", rel);
      const stat = fs.statSync(p);
      const mb = stat.size / (1024 * 1024);
      return { ...r, fileSize: `${mb.toFixed(1)} MB` };
    } catch {
      return r;
    }
  };

  const androidSized = withLocalFileSize(android);
  const windowsSized = withLocalFileSize(windows);
  const androidHistory = getAllReleasesByPlatform("ANDROID");
  const windowsHistory = getAllReleasesByPlatform("WINDOWS");

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-10 md:px-6">
      <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Download resmi POS Pro
          </div>
          <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Download Aplikasi <span className="text-primary">POS Pro</span>
          </h1>
          <p className="max-w-xl text-pretty text-muted-foreground">
            Gunakan POS di Android dan Windows Desktop. Download installer resmi, lihat requirement, changelog, dan riwayat versi.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Android APK</Badge>
            <Badge variant="secondary">Windows EXE</Badge>
            <Badge variant="secondary">Checksum SHA256</Badge>
          </div>
        </div>

        <Card className="rounded-2xl border bg-background/70 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base">Catatan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>Untuk keamanan, unduh hanya dari halaman ini.</div>
            <div>Jika file disimpan di storage eksternal, tautan akan mengarah ke domain penyedia.</div>
            <div>Di Vercel, file besar sebaiknya disimpan di R2/S3/Supabase Storage.</div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        {androidSized ? (
          <DownloadCard
            release={androidSized}
            icon={<Smartphone className="h-5 w-5" />}
            showQr
            qrSlot={<QrDownload url={androidSized.downloadUrl} />}
          />
        ) : (
          <Card className="rounded-2xl border bg-background/70">
            <CardContent className="p-6 text-sm text-muted-foreground">Rilis Android belum tersedia.</CardContent>
          </Card>
        )}
        {windowsSized ? (
          <DownloadCard release={windowsSized} icon={<Monitor className="h-5 w-5" />} />
        ) : (
          <Card className="rounded-2xl border bg-background/70">
            <CardContent className="p-6 text-sm text-muted-foreground">Rilis Windows belum tersedia.</CardContent>
          </Card>
        )}
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        {androidSized ? <InstallGuide title="Cara Install APK" steps={androidSized.installGuide} /> : null}
        {windowsSized ? <InstallGuide title="Cara Install EXE" steps={windowsSized.installGuide} /> : null}
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        {androidSized ? <ChangelogList version={androidSized.version} items={androidSized.changelog} /> : null}
        {windowsSized ? <ChangelogList version={windowsSized.version} items={windowsSized.changelog} /> : null}
      </section>

      <section className="mt-10">
        <div className="mb-3 text-lg font-semibold">Riwayat Versi</div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl border bg-background/70 shadow-sm backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Android</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {androidHistory.length === 0 ? (
                <div className="text-muted-foreground">Belum ada riwayat.</div>
              ) : (
                <ul className="space-y-2">
                  {androidHistory.map((r) => (
                    <li key={`${r.platform}-${r.version}`} className="flex items-center justify-between gap-3 rounded-xl border bg-background p-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{r.version}</div>
                        <div className="truncate text-xs text-muted-foreground">{r.releaseDate}</div>
                      </div>
                      <Badge variant="secondary">{r.fileName}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border bg-background/70 shadow-sm backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Windows</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {windowsHistory.length === 0 ? (
                <div className="text-muted-foreground">Belum ada riwayat.</div>
              ) : (
                <ul className="space-y-2">
                  {windowsHistory.map((r) => (
                    <li key={`${r.platform}-${r.version}`} className="flex items-center justify-between gap-3 rounded-xl border bg-background p-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{r.version}</div>
                        <div className="truncate text-xs text-muted-foreground">{r.releaseDate}</div>
                      </div>
                      <Badge variant="secondary">{r.fileName}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
