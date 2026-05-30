import Link from "next/link";
import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AppRelease } from "@/config/downloads";

export function DownloadCard({
  release,
  icon,
  showQr,
  qrSlot,
}: {
  release: AppRelease;
  icon: React.ReactNode;
  showQr?: boolean;
  qrSlot?: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border bg-background/70 shadow-sm backdrop-blur">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">{icon}</div>
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{release.name}</CardTitle>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{release.version}</Badge>
              <span className="hidden sm:inline">•</span>
              <span className="truncate">{release.fileName}</span>
              {release.fileSize ? (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span>{release.fileSize}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
        <Badge className="bg-primary text-primary-foreground">Latest</Badge>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
        <div className="space-y-3">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Requirement</div>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {release.requirements.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/70" />
                  <span className="leading-relaxed">{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {release.sha256 ? (
            <div className="rounded-xl border bg-muted/30 p-3 text-xs">
              <div className="font-medium text-muted-foreground">SHA256</div>
              <div className="mt-1 break-all font-mono text-muted-foreground">{release.sha256}</div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild className="rounded-xl">
              <Link href={release.platform === "ANDROID" ? "/api/downloads/android" : "/api/downloads/windows"} prefetch={false}>
                Download {release.platform === "ANDROID" ? "APK" : "EXE"}
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={release.downloadUrl} prefetch={false}>
                Direct Link
              </Link>
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            Download hanya dari website resmi. Pastikan checksum cocok sebelum install.
          </div>
        </div>

        {showQr ? <div className="md:pl-4">{qrSlot}</div> : null}
      </CardContent>
    </Card>
  );
}
