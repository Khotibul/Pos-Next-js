"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarcodeInput } from "@/components/pos/barcode-input";
import { BarcodeScannerDialog } from "@/components/products/barcode-scanner-dialog";
import { Alert } from "@/components/ui/alert";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function ProductScanClient() {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);

  async function handle(code: string) {
    setNotice(null);
    const res = await fetch(`/api/products/find-by-code?code=${encodeURIComponent(code)}`);
    const json = (await res.json().catch(() => null)) as unknown;
    const ok = isRecord(json) && json.ok === true && isRecord(json.data) && isRecord(json.data.product);
    if (!res.ok || !ok) {
      setNotice(isRecord(json) && typeof json.message === "string" ? json.message : "Produk tidak ditemukan.");
      return;
    }
    const product = (json.data as Record<string, unknown>).product as Record<string, unknown>;
    const id = typeof product.id === "string" ? product.id : String(product.id ?? "");
    if (!id) {
      setNotice("Produk tidak ditemukan.");
      return;
    }
    router.push(`/products/${id}`);
  }

  return (
    <div className="grid gap-3">
      {notice ? <Alert variant="destructive">{notice}</Alert> : null}
      <div className="flex flex-wrap items-center gap-2">
        <BarcodeScannerDialog onDetected={handle} label="Scan QR/Barcode" />
        <div className="min-w-[260px] flex-1">
          <BarcodeInput placeholder="Input SKU/Barcode..." onSubmitCode={handle} />
        </div>
      </div>
      <div className="text-xs text-muted-foreground">Hasil scan akan membuka halaman detail produk.</div>
    </div>
  );
}
