"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createSaleAction } from "@/modules/transactions/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ScanLine } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useVirtualizer } from "@tanstack/react-virtual";

const PrintReceiptDialog = dynamic(() => import("@/modules/transactions/components/print-receipt-dialog").then((m) => ({ default: m.PrintReceiptDialog })), { ssr: false });
const QrScannerDialog = dynamic(() => import("@/components/pos/qr-scanner-dialog").then((m) => ({ default: m.QrScannerDialog })), { ssr: false });
const OpenShiftDialog = dynamic(() => import("@/components/shifts/open-shift-dialog").then((m) => ({ default: m.OpenShiftDialog })), { ssr: false });
import type { PrinterSettings } from "@/modules/settings/printer/validators";

type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  barcode?: string | null;
  qrCode?: string | null;
  stock?: number;
  wholesalePrice?: number;
  wholesaleDiscountPercent?: number;
  wholesaleMinQty?: number;
};

type PaymentMethod = "CASH" | "QRIS" | "TRANSFER" | "EWALLET" | "CARD";

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

const ProductCard = memo(function ProductCard({
  product,
  onInc,
  showStock,
}: {
  product: Product;
  onInc: (id: string) => void;
  showStock: boolean;
}) {
  return (
    <button
      className="rounded-2xl border bg-background p-4 text-left shadow-sm transition-shadow hover:shadow-md active:shadow active:scale-[0.98]"
      onClick={() => onInc(product.id)}
      type="button"
    >
      <div className="text-sm font-semibold">{product.name}</div>
      <div className="mt-1 text-xs text-muted-foreground">{product.sku}</div>
      <div className="mt-3 text-lg font-semibold text-primary">{rupiah(product.price)}</div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Klik untuk tambah</span>
        {showStock ? <Badge variant="secondary">Stok {Number(product.stock ?? 0).toLocaleString("id-ID")}</Badge> : null}
        {product.wholesaleMinQty && product.wholesaleMinQty > 0 ? <Badge variant="outline" className="border-orange-300 text-orange-700">Grosir {product.wholesaleMinQty}+</Badge> : null}
      </div>
    </button>
  );
});

const CartLineItem = memo(function CartLineItem({
  item,
  product,
  onInc,
  onDec,
  showSku,
  showStock,
}: {
  item: { productId: string; name: string; sku: string; price: number; qty: number; lineTotal: number; isWholesale?: boolean };
  product: Product | undefined;
  onInc: (id: string) => void;
  onDec: (id: string) => void;
  showSku: boolean;
  showStock: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-background p-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{item.name}</div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {item.isWholesale && product && product.price !== item.price ? (
            <span><span className="line-through">{rupiah(product.price)}</span> {rupiah(item.price)} / unit</span>
          ) : (
            <span>{rupiah(item.price)} / unit</span>
          )}
          {showSku ? <span>• {item.sku}</span> : null}
          {showStock ? <Badge variant="secondary">Stok {Number(product?.stock ?? 0).toLocaleString("id-ID")}</Badge> : null}
          {item.isWholesale ? <Badge variant="outline" className="border-orange-300 text-orange-700">Grosir</Badge> : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => onDec(item.productId)}>
          -
        </Button>
        <div className="w-6 text-center text-sm font-medium">{item.qty}</div>
        <Button type="button" variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => onInc(item.productId)}>
          +
        </Button>
      </div>
    </div>
  );
});

export function PosScreen({ products, initialSettings }: { products: Product[]; initialSettings: PrinterSettings }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 300);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [cashPaid, setCashPaid] = useState<number>(0);
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
  const lastCodeRef = useRef<{ code: string; at: number } | null>(null);
  const gridParentRef = useRef<HTMLDivElement>(null);

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
    const s = debouncedQ.trim().toLowerCase();
    if (!s) return allProducts;
    return allProducts.filter((p) => {
      if (p.name.toLowerCase().includes(s)) return true;
      if (p.sku.toLowerCase().includes(s)) return true;
      const barcode = p.barcode?.toLowerCase() ?? "";
      const qr = p.qrCode?.toLowerCase() ?? "";
      return (barcode && barcode.includes(s)) || (qr && qr.includes(s));
    });
  }, [allProducts, debouncedQ]);

  const CARD_HEIGHT = 130;
  const COL_COUNT = 4;
  const gridRowCount = Math.ceil(filtered.length / COL_COUNT);
  const gridVirtualizer = useVirtualizer({
    count: gridRowCount,
    getScrollElement: () => gridParentRef.current,
    estimateSize: () => CARD_HEIGHT,
    overscan: 3,
  });

  const productByCode = useMemo(() => {
    const map = new Map<string, Product>();
    for (const product of allProducts) {
      for (const value of [product.sku, product.barcode, product.qrCode]) {
        const key = value?.trim().toLowerCase();
        if (key) map.set(key, product);
      }
    }
    return map;
  }, [allProducts]);

  const productMap = useMemo(() => {
    return new Map(allProducts.map((p) => [p.id, p]));
  }, [allProducts]);

  const lines = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([productId, qty]) => {
        const p = productMap.get(productId);
        if (!p) return null;
        const minQty = p.wholesaleMinQty ?? 0;
        const isWholesale = minQty > 0 && qty >= minQty;
        let unitPrice = p.price;
        if (isWholesale) {
          if (p.wholesalePrice && p.wholesalePrice > 0) {
            unitPrice = p.wholesalePrice;
          } else if (p.wholesaleDiscountPercent && p.wholesaleDiscountPercent > 0) {
            unitPrice = p.price * (1 - p.wholesaleDiscountPercent / 100);
          }
        }
        const lineTotal = unitPrice * qty;
        return { productId, name: p.name, sku: p.sku, price: unitPrice, qty, lineTotal, isWholesale };
      })
      .filter(Boolean) as Array<{ productId: string; name: string; sku: string; price: number; qty: number; lineTotal: number; isWholesale?: boolean }>;
  }, [cart, productMap]);

  const effectiveDiscount = settings.cartShowDiscount ? discount : 0;
  const effectiveTaxRate = settings.cartShowTax ? taxRate : 0;
  const subtotal = lines.reduce((a, l) => a + l.lineTotal, 0);
  const tax = Math.max(0, (subtotal - effectiveDiscount) * (effectiveTaxRate / 100));
  const total = Math.max(0, subtotal - effectiveDiscount + tax);
  const cashChange = Math.max(0, cashPaid - total);
  const cashShortage = Math.max(0, total - cashPaid);

  const addProductToCart = useCallback((product: Product) => {
    setExtraProducts((prev) => (prev.some((item) => item.id === product.id) ? prev : [...prev, product]));
    setCart((prev) => ({ ...prev, [product.id]: (prev[product.id] ?? 0) + 1 }));
    setNotice(`Ditambahkan: ${product.name}`);
  }, []);

  const inc = useCallback((id: string) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }, []);
  const dec = useCallback((id: string) => {
    setCart((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) - 1) }));
  }, []);

  const addByCode = useCallback(async (code: string, options?: { throwOnFail?: boolean; clearQuery?: boolean }) => {
    const clean = code.trim();
    if (!clean) return false;

    const now = Date.now();
    const last = lastCodeRef.current;
    if (last && last.code === clean && now - last.at <= 700) return false;
    lastCodeRef.current = { code: clean, at: now };

    setError(null);
    setNotice(null);

    const localProduct = productByCode.get(clean.toLowerCase());
    if (localProduct) {
      addProductToCart(localProduct);
      if (options?.clearQuery) setQ("");
      return true;
    }

    const res = await fetch(`/api/products/find-by-code?code=${encodeURIComponent(clean)}`);
    if (!res.ok) {
      const msg = res.status === 404 ? "Produk tidak ditemukan" : "Gagal memproses kode";
      setNotice(msg);
      if (options?.throwOnFail) throw new Error(msg);
      return false;
    }

    const json = (await res.json()) as {
      ok: true;
      data: { product: Product };
    };
    const p = json.data.product;
    addProductToCart(p);
    if (options?.clearQuery) setQ("");
    return true;
  }, [addProductToCart, productByCode]);

  useEffect(() => {
    let buffer = "";
    let lastAt = 0;
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    const reset = () => {
      buffer = "";
      lastAt = 0;
      if (resetTimer) {
        clearTimeout(resetTimer);
        resetTimer = null;
      }
    };

    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (isTypingTarget(event.target)) return;

      const now = Date.now();
      if (event.key === "Enter") {
        const code = buffer.trim();
        reset();
        if (code.length >= 4) {
          event.preventDefault();
          void addByCode(code);
        }
        return;
      }

      if (event.key.length !== 1) return;
      if (lastAt && now - lastAt > 120) buffer = "";
      buffer += event.key;
      lastAt = now;
      if (resetTimer) clearTimeout(resetTimer);
      resetTimer = setTimeout(reset, 180);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      reset();
    };
  }, [addByCode]);

  return (
    <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_430px] 2xl:grid-cols-[minmax(0,1fr)_460px]">
      <div className="order-2 min-w-0 xl:order-1">
        <div className="sticky top-[72px] z-10 mb-4 rounded-2xl border bg-background/90 p-3 backdrop-blur">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void addByCode(q, { clearQuery: true });
            }}
          >
            <div className="flex-1">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari produk, scan barcode, lalu Enter..."
                autoComplete="off"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              className="h-10 gap-2 rounded-xl"
              disabled={!q.trim()}
            >
              Tambah
            </Button>
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
          </form>
        </div>
        <div
          ref={gridParentRef}
          className="overflow-auto"
          style={{ maxHeight: "calc(100vh - 280px)" }}
        >
          <div
            style={{ height: `${gridVirtualizer.getTotalSize()}px`, position: "relative" }}
          >
            {gridVirtualizer.getVirtualItems().map((virtualRow) => {
              const start = virtualRow.index * COL_COUNT;
              const rowProducts = filtered.slice(start, start + COL_COUNT);
              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: `${virtualRow.size}px`,
                    willChange: "transform",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    {rowProducts.map((p) => (
                      <ProductCard key={p.id} product={p} onInc={inc} showStock={settings.cartShowStock} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
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
                <CartLineItem
                  key={l.productId}
                  item={l}
                  product={productMap.get(l.productId)}
                  onInc={inc}
                  onDec={dec}
                  showSku={settings.cartShowSku}
                  showStock={settings.cartShowStock}
                />
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
                    setCashPaid(0);
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

      <QrScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onDetected={async (code) => {
          await addByCode(code, { throwOnFail: true });
        }}
      />

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
