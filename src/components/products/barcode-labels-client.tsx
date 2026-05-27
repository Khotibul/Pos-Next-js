"use client";

import { useMemo, useState, useTransition } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Code128Mark } from "@/components/barcode/code128-mark";

type ProductItem = { id: string; sku: string; name: string; barcode: string | null };
type Row = { id: string; productId: string; qty: number };

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function BarcodeLabelsClient({ products }: { products: ProductItem[] }) {
  const [rows, setRows] = useState<Row[]>([{ id: uid(), productId: "", qty: 1 }]);
  const [preset, setPreset] = useState<"38x25" | "50x30" | "custom">("38x25");
  const [widthMm, setWidthMm] = useState(50);
  const [heightMm, setHeightMm] = useState(30);
  const [includeQr, setIncludeQr] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p]));
    return rows
      .filter((r) => r.productId)
      .map((r) => {
        const p = map.get(r.productId);
        return p ? { ...p, qty: r.qty } : null;
      })
      .filter(Boolean) as Array<ProductItem & { qty: number }>;
  }, [products, rows]);

  async function exportPdf() {
    setMessage(null);
    const items = rows.filter((r) => r.productId && r.qty > 0).map((r) => ({ productId: r.productId, qty: r.qty }));
    if (items.length === 0) {
      setMessage("Pilih minimal 1 produk.");
      return;
    }

    const payload = {
      label: preset === "custom" ? { preset, widthMm, heightMm, gapMm: 2 } : { preset, gapMm: 2 },
      includeQr,
      items,
    };

    const res = await fetch("/api/products/barcodes/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      setMessage(j?.message || "Gagal membuat PDF.");
      return;
    }

    const buf = await res.arrayBuffer();
    const blob = new Blob([buf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "barcode-labels.pdf";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="rounded-3xl">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Barcode Label</CardTitle>
        <Button
          type="button"
          className="gap-2 rounded-xl"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await exportPdf();
            });
          }}
        >
          <Download className="h-4 w-4" />
          {pending ? "Membuat..." : "Export PDF"}
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        {message ? <Alert variant="destructive">{message}</Alert> : null}

        <div className="grid gap-3 md:grid-cols-3">
          <div className="grid gap-2">
            <Label>Ukuran Label</Label>
            <select
              className="h-10 rounded-xl border bg-background px-3 text-sm"
              value={preset}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "38x25" || v === "50x30" || v === "custom") setPreset(v);
              }}
            >
              <option value="38x25">38mm x 25mm</option>
              <option value="50x30">50mm x 30mm</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          {preset === "custom" ? (
            <>
              <div className="grid gap-2">
                <Label>Lebar (mm)</Label>
                <Input type="number" value={widthMm} onChange={(e) => setWidthMm(Number(e.target.value || 0))} />
              </div>
              <div className="grid gap-2">
                <Label>Tinggi (mm)</Label>
                <Input type="number" value={heightMm} onChange={(e) => setHeightMm(Number(e.target.value || 0))} />
              </div>
            </>
          ) : (
            <div className="md:col-span-2" />
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeQr} onChange={(e) => setIncludeQr(e.target.checked)} />
          Sertakan QR Code
        </label>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Produk</div>
            <Button
              type="button"
              variant="outline"
              className="gap-2 rounded-xl"
              onClick={() => setRows((prev) => [...prev, { id: uid(), productId: "", qty: 1 }])}
            >
              <Plus className="h-4 w-4" />
              Tambah
            </Button>
          </div>

          <div className="grid gap-2">
            {rows.map((r) => (
              <div key={r.id} className="grid gap-2 rounded-2xl border bg-background p-3 md:grid-cols-[1fr_120px_44px] md:items-end">
                <div className="grid gap-2">
                  <Label>Produk</Label>
                  <select
                    className="h-10 rounded-xl border bg-background px-3 text-sm"
                    value={r.productId}
                    onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, productId: e.target.value } : x)))}
                  >
                    <option value="">Pilih produk</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} • {p.sku}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Qty Label</Label>
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    value={r.qty}
                    onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, qty: Number(e.target.value || 1) } : x)))}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 w-10 rounded-xl p-0 text-destructive"
                  onClick={() => setRows((prev) => (prev.length <= 1 ? prev : prev.filter((x) => x.id !== r.id)))}
                  aria-label="Hapus"
                  disabled={rows.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {selected.length > 0 ? (
          <div className="grid gap-3">
            <div className="text-sm font-semibold">Preview</div>
            <div className="grid gap-3 md:grid-cols-2">
              {selected.slice(0, 6).map((p) => (
                <div key={p.id} className="rounded-2xl border bg-muted/10 p-3">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {p.sku} • Qty label: {p.qty}
                  </div>
                  <div className="mt-3 overflow-hidden rounded-xl border bg-background p-3">
                    <Code128Mark value={(p.barcode ?? p.sku) as string} label={p.barcode ?? p.sku} height={44} moduleWidth={2} />
                  </div>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">Preview menampilkan maksimal 6 item untuk performa.</div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
