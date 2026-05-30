"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

function toAbsoluteUrl(url: string) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (typeof window === "undefined") return url;
  const origin = window.location.origin;
  return new URL(url, origin).toString();
}

export function QrDownload({ url, size = 132 }: { url: string; size?: number }) {
  const absoluteUrl = useMemo(() => toAbsoluteUrl(url), [url]);
  const [dataUrl, setDataUrl] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let alive = true;
    setError("");
    setDataUrl("");
    if (!absoluteUrl) return;

    QRCode.toDataURL(absoluteUrl, { margin: 1, width: size })
      .then((u) => {
        if (!alive) return;
        setDataUrl(u);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Gagal membuat QR Code.");
      });

    return () => {
      alive = false;
    };
  }, [absoluteUrl, size]);

  if (error) return <div className="text-xs text-destructive">{error}</div>;
  if (!dataUrl) return <div className="h-[132px] w-[132px] animate-pulse rounded-xl bg-muted" />;

  return (
    <div className="rounded-2xl border bg-background p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt="QR download" width={size} height={size} className="h-auto w-auto rounded-xl" />
      <div className="mt-2 text-center text-xs text-muted-foreground">Scan untuk download</div>
    </div>
  );
}

