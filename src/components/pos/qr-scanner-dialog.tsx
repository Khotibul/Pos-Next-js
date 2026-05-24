"use client";

import { useEffect, useRef, useState } from "react";
import { CameraOff, Loader2, ScanLine } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { BarcodeInput } from "@/components/pos/barcode-input";

type Status = "idle" | "starting" | "ready" | "processing" | "error";

const FORMATS = ["qr_code", "code_128", "ean_13", "ean_8", "upc_a", "upc_e"] as const;

function isBarcodeDetectorAvailable(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

export function QrScannerDialog({
  open,
  onOpenChange,
  onDetected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (code: string) => Promise<void>;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScanRef = useRef<{ v: string; at: number } | null>(null);
  const processingRef = useRef(false);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function stopCamera() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const stream = streamRef.current;
    streamRef.current = null;
    if (stream) {
      for (const t of stream.getTracks()) t.stop();
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  useEffect(() => {
    if (!open) {
      setStatus("idle");
      setError(null);
      processingRef.current = false;
      void stopCamera();
      return;
    }

    let cancelled = false;
    setStatus("starting");
    setError(null);
    processingRef.current = false;

    async function start() {
      try {
        if (!isBarcodeDetectorAvailable()) {
          setStatus("error");
          setError("Scanner kamera tidak didukung browser ini. Gunakan input manual barcode/SKU.");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        if (cancelled) {
          for (const t of stream.getTracks()) t.stop();
          return;
        }

        streamRef.current = stream;
        const v = videoRef.current;
        if (!v) throw new Error("Video element not ready");

        v.srcObject = stream;
        v.setAttribute("playsinline", "true");
        await v.play();

        const Detector = (window as unknown as { BarcodeDetector?: new (opts?: { formats?: readonly string[] }) => { detect: (src: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>> } })
          .BarcodeDetector;
        if (!Detector) {
          setStatus("error");
          setError("Scanner kamera tidak didukung browser ini. Gunakan input manual barcode/SKU.");
          return;
        }

        const detector = new Detector({ formats: FORMATS });
        setStatus("ready");

        const loop = async () => {
          if (cancelled) return;
          if (!videoRef.current) return;
          if (processingRef.current) return;

          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              const raw = (codes[0]?.rawValue ?? "").trim();
              if (raw) {
                const now = Date.now();
                const last = lastScanRef.current;
                if (!last || last.v !== raw || now - last.at > 1000) {
                  lastScanRef.current = { v: raw, at: now };
                  processingRef.current = true;
                  setStatus("processing");
                  try {
                    await onDetected(raw);
                    if (!cancelled) onOpenChange(false);
                    return;
                  } catch (e: unknown) {
                    processingRef.current = false;
                    if (!cancelled) {
                      setStatus("ready");
                      setError(e instanceof Error ? e.message : "Gagal memproses hasil scan.");
                    }
                  }
                }
              }
            }
          } catch {
            // ignore frame errors
          }

          rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : "Gagal mengakses kamera. Pastikan izin kamera diizinkan pada browser.";
        setStatus("error");
        setError(msg);
      }
    }

    void start();
    return () => {
      cancelled = true;
      void stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const starting = status === "starting";
  const processing = status === "processing";

  return (
    <Dialog open={open} onOpenChange={(v) => onOpenChange(v)}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            Scan QR/Barcode
          </DialogTitle>
          <DialogDescription>Arahkan kamera ke QR Code / Barcode.</DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="destructive" className="flex items-center gap-2">
            <CameraOff className="h-4 w-4" />
            {error}
          </Alert>
        ) : null}

        <div className="grid gap-3">
          <div className="relative overflow-hidden rounded-2xl border bg-muted/10">
            <video ref={videoRef} className="aspect-video w-full object-cover" />
            {starting ? (
              <div className="absolute inset-0 grid place-items-center bg-background/80">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memulai kamera...
                </div>
              </div>
            ) : null}
            {processing ? (
              <div className="absolute inset-0 grid place-items-center bg-background/80">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memproses hasil scan...
                </div>
              </div>
            ) : null}
          </div>

          <div className="text-xs text-muted-foreground">
            Jika kamera tidak tersedia, gunakan input manual di bawah.
          </div>
          <BarcodeInput onSubmitCode={onDetected} disabled={processing} />
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
              disabled={processing}
            >
              Tutup Scanner
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
