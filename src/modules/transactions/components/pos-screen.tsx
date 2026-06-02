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
import { QrScannerDialog } from "@/components/pos/qr-scanner-dialog";
import { OpenShiftDialog } from "@/components/shifts/open-shift-dialog";
import { ScanLine } from "lucide-react";
import type { PrinterSettings } from "@/modules/settings/printer/validators";

type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  barcode?: string | null;
  qrCode?: string | null;
  stock?: number;
};

type PaymentMethod = "CASH" | "QRIS" | "TRANSFER" | "EWALLET" | "CARD";

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export function PosScreen({ products, initialSettings }: { products: Product[]; initialSettings: PrinterSettings }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [cashPaid, setCashPaid] = useState<number>(0);
  const [cashPaidTouched, setCashPaidTouched] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(11);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<string | null>(null);
  const [saleId, setSaleId] = useState<string | null>(null);
  const [printPayload, setPrintPayload] = useState<{ saleId: string; auto: boolean } | null>(null);
  const [settings, setSettings] = useState<PrinterSettings>(initialSettings);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [extraProducts, setExtraProducts] = useState<Product[]>([]);
  const [openShiftId, setOpenShiftId] = useState<string | null>(null);
  const [shiftCheckDone, setShiftCheckDone] = useState(false);
  const [forceOpenShift, setForceOpenShift] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let ignore = false;
    fetch("/api/settings/printer")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (ignore) return;
        if (data?.data) setSettings(data.data as PrinterSettings);
      })
      .catch(() => {
        // Keep server-provided initial settings.
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    setShiftCheckDone(false);
    fetch("/api/shifts/open")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (ignore) return;
        const id = json?.data?.shiftId ?? null;
        setOpenShiftId(typeof id === "string" ? id : null);
        setForceOpenShift(!id);
      })
      .catch(() => {
        if (ignore) return;
        // If we cannot determine shift state, don't hard-block UI;
        // the server will still reject createSale if shift isn't open.
        setForceOpenShift(false);
      })
      .finally(() => {
        if (ignore) return;
        setShiftCheckDone(true);
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(t);
  }, [notice]);

  const allProducts = useMemo(() => {
    if (extraProducts.length === 0) return products;
    const map = new Map<string, Product>();
    for (const p of products) map.set(p.id, p);
    for (const p of extraProducts) if (!map.has(p.id)) map.set(p.id, p);
    return Array.from(map.values());
  }, [products, extraProducts]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return allProducts;
    return allProducts.filter((p) => {
      if (p.name.toLowerCase().includes(s)) return true;
      if (p.sku.toLowerCase().includes(s)) return true;
      const barcode = p.barcode?.toLowerCase() ?? "";
      const qr = p.qrCode?.toLowerCase() ?? "";
      return (barcode && barcode.includes(s)) || (qr && qr.includes(s));
    });
  }, [allProducts, q]);

  const lines = useMemo(() => {
    const map = new Map(allProducts.map((p) => [p.id, p]));
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([productId, qty]) => {
        const p = map.get(productId);
        if (!p) return null;
        const lineTotal = p.price * qty;
        return { productId, name: p.name, sku: p.sku, price: p.price, qty, lineTotal };
      })
      .filter(Boolean) as Array<{ productId: string; name: string; sku: string; price: number; qty: number; lineTotal: number }>;
  }, [cart, allProducts]);

  const effectiveDiscount = settings.cartShowDiscount ? discount : 0;
  const effectiveTaxRate = settings.cartShowTax ? taxRate : 0;
  const subtotal = lines.reduce((a, l) => a + l.lineTotal, 0);
  const tax = Math.max(0, (subtotal - effectiveDiscount) * (effectiveTaxRate / 100));
  const total = Math.max(0, subtotal - effectiveDiscount + tax);
  const cashChange = Math.max(0, cashPaid - total);
  const cashShortage = Math.max(0, total - cashPaid);

  useEffect(() => {
    if (method !== "CASH") return;
    if (cashPaidTouched) return;
    setCashPaid(total);
  }, [method, total, cashPaidTouched]);

  function inc(id: string) {
    setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }
  function dec(id: string) {
    setCart((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) - 1) }));
  }

  async function addByCode(code: string) {
    const clean = code.trim();
    if (!clean) return;
    setError(null);
    setNotice(null);

    const res = await fetch(`/api/products/find-by-code?code=${encodeURIComponent(clean)}`);
    if (!res.ok) {
      const msg = res.status === 404 ? "Produk tidak ditemukan" : "Gagal memproses kode";
      setNotice(msg);
      return;
    }

    const json = (await res.json()) as {
      ok: true;
      data: { product: { id: string; name: string; sku: string; barcode: string | null; qrCode: string | null; price: number } };
    };
    const p = json.data.product;
    setExtraProducts((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, { ...p }]));
    inc(p.id);
    setNotice(`Ditambahkan: ${p.name}`);
  }

  return (
    <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_430px] 2xl:grid-cols-[minmax(0,1fr)_460px]">
      <div className="order-2 min-w-0 xl:order-1">
        <div className="sticky top-[72px] z-10 mb-4 rounded-2xl border bg-background/90 p-3 backdrop-blur">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari produk atau barcode..." />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 rounded-xl"
              onClick={() => setScannerOpen(true)}
              aria-label="Scan QR/Barcode"
            >
              <ScanLine className="h-4 w-4" />
              <span className="hidden sm:inline">Scan</span>
            </Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
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
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Klik untuk tambah</span>
                {settings.cartShowStock ? <Badge variant="secondary">Stok {Number(p.stock ?? 0).toLocaleString("id-ID")}</Badge> : null}
              </div>
            </button>
          ))}
        </div>
      </div>

      <Card className="order-1 flex min-h-0 flex-col overflow-hidden rounded-3xl xl:sticky xl:top-[72px] xl:order-2 xl:max-h-[calc(100vh-96px)]">
        <CardHeader className="shrink-0 border-b py-4">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Keranjang Belanja</CardTitle>
            {invoice ? <Badge variant="secondary">Order {invoice}</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4">
          {notice ? <Alert>{notice}</Alert> : null}
          {error ? <Alert variant="destructive">{error}</Alert> : null}

          <div className="min-h-[120px] flex-1 overflow-y-auto pr-1">
            <div className="grid gap-2">
            {lines.length === 0 ? (
              <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">Belum ada item.</div>
            ) : (
              lines.map((l) => (
                <div key={l.productId} className="flex items-center justify-between gap-3 rounded-xl border bg-background p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{l.name}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{rupiah(l.price)} / unit</span>
                      {settings.cartShowSku ? <span>• {l.sku}</span> : null}
                      {settings.cartShowStock ? <Badge variant="secondary">Stok {Number(allProducts.find((p) => p.id === l.productId)?.stock ?? 0).toLocaleString("id-ID")}</Badge> : null}
                    </div>
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
          </div>

          <div className="shrink-0 rounded-xl border bg-background p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{rupiah(subtotal)}</span>
            </div>
            {settings.cartShowDiscount ? (
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
            ) : null}
            {settings.cartShowTax ? (
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Pajak (%)</span>
              <input
                type="number"
                className="h-10 w-24 rounded-xl border bg-background px-3 text-sm"
                value={effectiveTaxRate}
                min={0}
                max={100}
                onChange={(e) => setTaxRate(Number(e.target.value || 0))}
              />
            </div>
            ) : null}
            {settings.cartShowTax ? (
            <div className="mt-2 flex justify-between">
              <span className="text-muted-foreground">Pajak</span>
              <span>{rupiah(tax)}</span>
            </div>
            ) : null}
            <div className="mt-3 flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="text-primary">{rupiah(total)}</span>
            </div>
          </div>

          <div className="shrink-0 grid gap-2">
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
                  onClick={() => {
                    setMethod(m.k);
                    if (m.k === "CASH") {
                      setCashPaidTouched(false);
                      setCashPaid(total);
                    } else {
                      setCashPaidTouched(false);
                      setCashPaid(0);
                    }
                  }}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    method === m.k ? "border-primary bg-primary/5 text-primary" : "bg-background text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {method === "CASH" ? (
            <div className="shrink-0 rounded-xl border bg-background p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Tunai dibayarkan</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className="h-10 w-44 rounded-xl border bg-background px-3 text-right text-sm"
                  value={Number.isFinite(cashPaid) ? cashPaid : 0}
                  min={0}
                  onChange={(e) => {
                    setCashPaidTouched(true);
                    setCashPaid(Number(e.target.value || 0));
                  }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-muted-foreground">Kembalian</span>
                <span className={cashShortage > 0 ? "font-medium text-destructive" : "font-medium text-primary"}>
                  {cashShortage > 0 ? `Kurang ${rupiah(cashShortage)}` : rupiah(cashChange)}
                </span>
              </div>
            </div>
          ) : null}

          <div className="shrink-0 grid gap-2">
            <Button
              type="button"
              className="h-12"
              disabled={
                isPending || lines.length === 0 || (shiftCheckDone && !openShiftId) || (method === "CASH" && cashPaid < total)
              }
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  if (method === "CASH" && cashPaid < total) {
                    setError("Uang tunai kurang dari total transaksi.");
                    return;
                  }
                  const payload = {
                    items: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
                    discount: effectiveDiscount,
                    taxRate: effectiveTaxRate,
                    payment: {
                      method,
                      amount: total,
                      receivedAmount: method === "CASH" ? cashPaid : total,
                      changeAmount: method === "CASH" ? cashChange : 0,
                      reference: "",
                    },
                  };
                  const res = await createSaleAction(payload);
                  if (!res.ok) {
                    setError(res.message);
                    if (res.message.toLowerCase().includes("shift")) setForceOpenShift(true);
                    return;
                  }
                  setInvoice(res.data.invoiceNo);
                  setSaleId(res.data.id);
                  // Show receipt preview popup in-place (no new tab).
                  setPrintPayload({ saleId: res.data.id, auto: Boolean(settings.autoPrintAfterPayment) });
                  setCart({});
                  setCashPaidTouched(false);
                  setCashPaid(0);
                  router.refresh();
                });
              }}
            >
              {isPending ? "Memproses..." : shiftCheckDone && !openShiftId ? "Buka Shift dulu" : "Bayar Sekarang"}
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

      <QrScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} onDetected={addByCode} />

      <OpenShiftDialog
        open={forceOpenShift}
        onOpenChange={setForceOpenShift}
        hideTrigger
        preventClose
        onOpened={(id) => {
          setOpenShiftId(id);
          setNotice("Shift berhasil dibuka. Silakan mulai transaksi.");
          setForceOpenShift(false);
          router.refresh();
        }}
      />
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
      payments: Array<{ id: string; method: string; amount: number; receivedAmount: number; changeAmount: number; reference: string | null }>;
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
