"use client";

import { useMemo, useState, useTransition } from "react";
import { createSaleAction } from "@/modules/transactions/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PrintReceiptDialog } from "@/modules/transactions/components/print-receipt-dialog";

type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
};

type PaymentMethod = "CASH" | "QRIS" | "TRANSFER" | "EWALLET" | "CARD";

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export function PosScreen({ products }: { products: Product[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(11);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<string | null>(null);
  const [saleId, setSaleId] = useState<string | null>(null);
  const [printPayload, setPrintPayload] = useState<{ saleId: string; auto: boolean } | null>(null);
  const [autoPrint, setAutoPrint] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let ignore = false;
    fetch("/api/settings/printer")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (ignore) return;
        const v = data?.data?.autoPrintAfterPayment;
        setAutoPrint(typeof v === "boolean" ? v : false);
      })
      .catch(() => {
        if (ignore) return;
        setAutoPrint(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products;
    return products.filter((p) => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s));
  }, [products, q]);

  const lines = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p]));
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([productId, qty]) => {
        const p = map.get(productId);
        if (!p) return null;
        const lineTotal = p.price * qty;
        return { productId, name: p.name, sku: p.sku, price: p.price, qty, lineTotal };
      })
      .filter(Boolean) as Array<{ productId: string; name: string; sku: string; price: number; qty: number; lineTotal: number }>;
  }, [cart, products]);

  const subtotal = lines.reduce((a, l) => a + l.lineTotal, 0);
  const tax = Math.max(0, (subtotal - discount) * (taxRate / 100));
  const total = Math.max(0, subtotal - discount + tax);

  function inc(id: string) {
    setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }
  function dec(id: string) {
    setCart((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) - 1) }));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="sticky top-[72px] z-10 mb-4 rounded-2xl border bg-background/90 p-3 backdrop-blur">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari produk atau barcode..." />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <button
              key={p.id}
              className="rounded-2xl border bg-background p-4 text-left transition-colors hover:bg-muted/30"
              onClick={() => inc(p.id)}
              type="button"
            >
              <div className="text-sm font-semibold">{p.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{p.sku}</div>
              <div className="mt-3 text-lg font-semibold text-primary">{rupiah(p.price)}</div>
              <div className="mt-2 text-xs text-muted-foreground">Klik untuk tambah ke keranjang</div>
            </button>
          ))}
        </div>
      </div>

      <Card className="lg:sticky lg:top-[72px] lg:h-[calc(100vh-96px)]">
        <CardHeader className="py-4">
          <CardTitle className="text-base">Keranjang Belanja</CardTitle>
          {invoice ? <Badge variant="secondary">Order {invoice}</Badge> : null}
        </CardHeader>
        <CardContent className="grid gap-3">
          {error ? <Alert variant="destructive">{error}</Alert> : null}

          <div className="grid gap-2">
            {lines.length === 0 ? (
              <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">Belum ada item.</div>
            ) : (
              lines.map((l) => (
                <div key={l.productId} className="flex items-center justify-between gap-3 rounded-xl border bg-background p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{l.name}</div>
                    <div className="text-xs text-muted-foreground">{rupiah(l.price)} / unit</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => dec(l.productId)}>
                      -
                    </Button>
                    <div className="w-6 text-center text-sm font-medium">{l.qty}</div>
                    <Button type="button" variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => inc(l.productId)}>
                      +
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="rounded-xl border bg-background p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{rupiah(subtotal)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Diskon</span>
              <input
                type="number"
                className="h-10 w-40 rounded-xl border bg-background px-3 text-sm"
                value={discount}
                min={0}
                onChange={(e) => setDiscount(Number(e.target.value || 0))}
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Pajak (%)</span>
              <input
                type="number"
                className="h-10 w-24 rounded-xl border bg-background px-3 text-sm"
                value={taxRate}
                min={0}
                max={100}
                onChange={(e) => setTaxRate(Number(e.target.value || 0))}
              />
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-muted-foreground">Pajak</span>
              <span>{rupiah(tax)}</span>
            </div>
            <div className="mt-3 flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="text-primary">{rupiah(total)}</span>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-medium">Metode Pembayaran</div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { k: "CASH", label: "Tunai" },
                  { k: "QRIS", label: "QRIS" },
                  { k: "CARD", label: "Kartu" },
                  { k: "TRANSFER", label: "Transfer" },
                  { k: "EWALLET", label: "E-Wallet" },
                ] as Array<{ k: PaymentMethod; label: string }>
              ).map((m) => (
                <button
                  key={m.k}
                  type="button"
                  onClick={() => setMethod(m.k)}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    method === m.k ? "border-primary bg-primary/5 text-primary" : "bg-background text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Button
              type="button"
              className="h-12"
              disabled={isPending || lines.length === 0}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const payload = {
                    items: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
                    discount,
                    taxRate,
                    payment: { method, amount: total, reference: "" },
                  };
                  const res = await createSaleAction(payload);
                  if (!res.ok) {
                    setError(res.message);
                    return;
                  }
                  setInvoice(res.data.invoiceNo);
                  setSaleId(res.data.id);
                  // Show receipt preview popup in-place (no new tab).
                  setPrintPayload({ saleId: res.data.id, auto: Boolean(autoPrint) });
                  setCart({});
                  router.refresh();
                });
              }}
            >
              {isPending ? "Memproses..." : "Bayar Sekarang"}
            </Button>
            {saleId ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setPrintPayload({ saleId, auto: false })}
              >
                Cetak Struk
              </Button>
            ) : null}
            <Button type="button" variant="secondary" disabled={isPending} onClick={() => setCart({})}>
              Batalkan
            </Button>
          </div>
        </CardContent>
      </Card>

      {printPayload ? <PosReceiptPopup saleId={printPayload.saleId} auto={printPayload.auto} onDone={() => setPrintPayload(null)} /> : null}
    </div>
  );
}

type ReceiptApiResponse = {
  ok: true;
  data: {
    sale: {
      id: string;
      invoiceNo: string;
      status: string;
      createdAt: string;
      subtotal: number;
      discount: number;
      tax: number;
      total: number;
      items: Array<{ id: string; name: string; sku: string; price: number; qty: number; lineTotal: number }>;
      payments: Array<{ id: string; method: string; amount: number; reference: string | null }>;
    };
    printer: import("@/modules/settings/printer/validators").PrinterSettings;
  };
};

function PosReceiptPopup({ saleId, auto, onDone }: { saleId: string; auto: boolean; onDone: () => void }) {
  const [data, setData] = useState<ReceiptApiResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setErr(null);
    fetch(`/api/pos/receipt/${saleId}`)
      .then((r) => (r.ok ? r.json() : r.json().then((j) => Promise.reject(new Error(j?.message || "Gagal memuat struk")))))
      .then((json: ReceiptApiResponse) => {
        if (ignore) return;
        setData(json?.data ?? null);
      })
      .catch((e) => {
        if (ignore) return;
        setErr(e?.message || "Gagal memuat struk");
      })
      .finally(() => {
        if (ignore) return;
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [saleId]);

  if (loading) return null;
  if (err || !data) return null;

  return (
    <PrintReceiptDialog
      sale={data.sale}
      printer={data.printer}
      triggerLabel={null}
      defaultOpen
      autoPrintOnOpen={auto}
      onOpenChange={(v) => {
        if (!v) onDone();
      }}
    />
  );
}
