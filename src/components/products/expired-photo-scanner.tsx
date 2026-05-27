"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Image as ImageIcon, Loader2, ScanText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Result = {
  expiredDateIso: string | null;
  batchNumber: string | null;
  confidence: number | null;
  rawText: string;
};

const TESSERACT_CDN = "https://esm.sh/tesseract.js@5.1.0?target=es2022";

export function ExpiredPhotoScanner({
  open,
  onOpenChange,
  onUseResult,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUseResult: (r: { expiredDateIso: string | null; batchNumber: string | null; rawText: string; confidence: number | null }) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  async function runOcr(file: File) {
    if (file.size > 5 * 1024 * 1024) throw new Error("Ukuran foto maksimal 5MB.");
    setErr(null);
    setStatus("running");
    setResult(null);

    const mod = (await import(/* webpackIgnore: true */ TESSERACT_CDN)) as unknown as {
      createWorker?: (lang?: string) => Promise<{
        recognize: (img: string) => Promise<{ data: { text: string; confidence: number } }>;
        terminate: () => Promise<void>;
      }>;
    };
    const createWorker = mod?.createWorker;
    if (!createWorker) throw new Error("OCR module tidak tersedia.");

    const worker = await createWorker("eng");
    try {
      const imgUrl = URL.createObjectURL(file);
      const rec = await worker.recognize(imgUrl);
      URL.revokeObjectURL(imgUrl);
      const text = rec?.data?.text ?? "";
      const confidence = typeof rec?.data?.confidence === "number" ? rec.data.confidence / 100 : null;

      const parsed = await fetch("/api/products/ocr-expired", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }).then((r) => (r.ok ? r.json() : null));

      const expiredDateIso = parsed?.data?.expiredDate ? String(parsed.data.expiredDate) : null;
      const batchNumber = parsed?.data?.batchNumber ? String(parsed.data.batchNumber) : null;
      const confHint = typeof parsed?.data?.confidence === "number" ? parsed.data.confidence : null;

      setResult({ expiredDateIso, batchNumber, rawText: text, confidence: confHint ?? confidence });
      setStatus("done");
    } finally {
      await worker.terminate().catch(() => {});
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setErr(null);
          setStatus("idle");
          setResult(null);
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanText className="h-5 w-5 text-primary" />
            Scan Expired dari Foto
          </DialogTitle>
          <DialogDescription>Upload foto label/kemasan, sistem akan OCR dan menebak expired date + batch.</DialogDescription>
        </DialogHeader>

        {err ? <Alert variant="destructive">{err}</Alert> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <div className="text-sm font-semibold">Foto</div>
            <div className="grid gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.currentTarget.files?.[0];
                  if (!f) return;
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  const url = URL.createObjectURL(f);
                  setPreviewUrl(url);
                  setStatus("idle");
                  setErr(null);
                  setResult(null);
                  startTransition(async () => {
                    try {
                      await runOcr(f);
                    } catch (e2: unknown) {
                      setStatus("error");
                      setErr(e2 instanceof Error ? e2.message : "Gagal OCR.");
                    }
                  });
                }}
              />

              <div className="grid gap-2 rounded-2xl border bg-muted/10 p-4">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Preview" className="aspect-video w-full rounded-xl object-cover" />
                ) : (
                  <div className="grid place-items-center rounded-xl border border-dashed bg-background p-10 text-center text-sm text-muted-foreground">
                    <div className="grid gap-2">
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                      <div>Pilih foto expired label</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="gap-2 rounded-xl" onClick={() => fileRef.current?.click()}>
                  <ImageIcon className="h-4 w-4" />
                  Upload Foto
                </Button>
                <Button type="button" variant="outline" className="gap-2 rounded-xl" onClick={() => fileRef.current?.click()}>
                  <Camera className="h-4 w-4" />
                  Ambil Foto
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-semibold">Hasil</div>
            <div className="grid gap-3 rounded-2xl border bg-background p-4">
              {status === "running" || pending ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memproses OCR...
                </div>
              ) : null}

              {result ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Deteksi</div>
                    {typeof result.confidence === "number" ? (
                      <Badge className="bg-primary/10 text-primary">{Math.round(result.confidence * 100)}%</Badge>
                    ) : (
                      <Badge variant="secondary">n/a</Badge>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <div className="grid gap-2">
                      <Label>Expired Date</Label>
                      <Input value={result.expiredDateIso ? result.expiredDateIso.slice(0, 10) : ""} readOnly />
                    </div>
                    <div className="grid gap-2">
                      <Label>Batch Number</Label>
                      <Input value={result.batchNumber ?? ""} readOnly />
                    </div>
                  </div>
                  <div className="rounded-xl border bg-muted/10 p-3 text-xs text-muted-foreground">
                    <div className="mb-1 font-medium text-foreground">Raw OCR Text</div>
                    <pre className="max-h-40 whitespace-pre-wrap">{result.rawText}</pre>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Upload foto untuk mulai OCR.</div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            disabled={!result}
            onClick={() => {
              if (!result) return;
              onUseResult({ expiredDateIso: result.expiredDateIso, batchNumber: result.batchNumber, rawText: result.rawText, confidence: result.confidence });
              onOpenChange(false);
            }}
          >
            Gunakan Hasil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
