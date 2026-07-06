"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createSaleAction } from "@/modules/transactions/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ScanLine } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useVirtualizer } from "@tanstack/react-virtual";
import { VoiceInputButton } from "@/components/pos/voice-input-button";
import { TransactionSuccessDialog } from "@/components/pos/transaction-success-dialog";
import { requestPrint } from "@/modules/transactions/components/receipt-view";
import type { ReceiptSale } from "@/modules/transactions/components/receipt-view";
import { CartSidebar } from "./cart/cart-sidebar";
import { MobileCartSheet } from "./cart/mobile-cart-sheet";
import { ProductCard } from "./product-card";
import type { PaymentMethod, Product } from "./cart/cart-common";
import { rupiah } from "./cart/cart-common";
import type { PrinterSettings } from "@/modules/settings/printer/validators";
import { ErrorBoundary } from "@/components/error-boundary";

const QrScannerDialog = dynamic(() => import("@/components/pos/qr-scanner-dialog").then((m) => ({ default: m.QrScannerDialog })), { ssr: false });
const OpenShiftDialog = dynamic(() => import("@/components/shifts/open-shift-dialog").then((m) => ({ default: m.OpenShiftDialog })), { ssr: false });

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
  const [printing, setPrinting] = useState(false);
  const [settings, setSettings] = useState<PrinterSettings>(initialSettings);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [extraProducts, setExtraProducts] = useState<Product[]>([]);
  const [openShiftId, setOpenShiftId] = useState<string | null>(null);
  const [shiftCheckDone, setShiftCheckDone] = useState(false);
  const [forceOpenShift, setForceOpenShift] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [successDialog, setSuccessDialog] = useState<{
    invoiceNo: string;
    total: number;
    subtotal: number;
    discount: number;
    tax: number;
    paymentMethod: string;
    receivedAmount: number;
    changeAmount: number;
    items: Array<{ name: string; price: number; qty: number; lineTotal: number }>;
  } | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
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
      .catch(() => {});
    return () => { ignore = true; };
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
        setForceOpenShift(false);
      })
      .finally(() => {
        if (ignore) return;
        setShiftCheckDone(true);
      });
    return () => { ignore = true; };
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

  const [colCount, setColCount] = useState(4);

  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      if (w < 480) setColCount(1);
      else if (w < 768) setColCount(2);
      else if (w < 1280) setColCount(3);
      else if (w < 1920) setColCount(4);
      else setColCount(5);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const gridRowCount = Math.ceil(filtered.length / colCount);
  const gridVirtualizer = useVirtualizer({
    count: gridRowCount,
    getScrollElement: () => gridParentRef.current,
    estimateSize: () => 175,
    measureElement: (el) => el.getBoundingClientRect().height,
    overscan: 3,
  });

  const productByCode = useMemo(() => {
    const map = new Map<string, Product>();
    for (const product of allProducts) {
      // Process SKU
      if (product.sku) {
        const skuKey = product.sku.trim().toLowerCase();
        if (skuKey) map.set(skuKey, product);
      }
      
      // Process barcode
      if (product.barcode) {
        const barcodeKey = product.barcode.trim().toLowerCase();
        if (barcodeKey) map.set(barcodeKey, product);
      }
      
      // Process QR code
      if (product.qrCode) {
        const qrKey = product.qrCode.trim().toLowerCase();
        if (qrKey) map.set(qrKey, product);
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

  const handlePay = useCallback(() => {
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
      setCart({});
      setCashPaid(0);
      setCartOpen(false);
      setSuccessDialog({
        invoiceNo: res.data.invoiceNo,
        total,
        subtotal,
        discount: effectiveDiscount,
        tax,
        paymentMethod: method,
        receivedAmount: method === "CASH" ? cashPaid : total,
        changeAmount: cashChange,
        items: lines.map((l) => ({ name: l.name, price: l.price, qty: l.qty, lineTotal: l.lineTotal })),
      });
    });
  }, [method, cashPaid, total, subtotal, tax, lines, effectiveDiscount, effectiveTaxRate, cashChange, startTransition, setError, setForceOpenShift, setInvoice, setSaleId, setCart, setCashPaid, setSuccessDialog]);

  const handleVoiceProduct = useCallback(async (productName: string, qty: number): Promise<boolean> => {
    const lower = productName.toLowerCase();
    const found = allProducts.find((p) => p.name.toLowerCase().includes(lower) || lower.includes(p.name.toLowerCase()));
    if (!found) return false;
    setExtraProducts((prev) => (prev.some((item) => item.id === found.id) ? prev : [...prev, found]));
    setCart((prev) => ({ ...prev, [found.id]: (prev[found.id] ?? 0) + qty }));
    setNotice(`Suara: ${found.name} x${qty}`);
    return true;
  }, [allProducts]);

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

  const addByCodeRef = useRef(addByCode);
  addByCodeRef.current = addByCode;

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
          void addByCodeRef.current(code);
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
  }, []);

  // Clean up extraProducts: remove products that are not in the original products and have zero quantity in cart
  useEffect(() => {
    const originalProductIds = new Set(products.map(p => p.id));
    let hasChanged = false;
    const newExtraProducts = extraProducts.filter(p => {
      if (originalProductIds.has(p.id)) {
        return true;
      }
      return cart[p.id] > 0;
    });
    if (newExtraProducts.length !== extraProducts.length) {
      hasChanged = true;
    } else {
      for (let i = 0; i < extraProducts.length; i++) {
        if (newExtraProducts[i] !== extraProducts[i]) {
          hasChanged = true;
          break;
        }
      }
    }
    if (hasChanged) {
      setExtraProducts(newExtraProducts);
    }
  }, [cart, extraProducts, products]);

  const cartItemCount = lines.length;

  const productCount = filtered.length;

  return (
    <ErrorBoundary>
      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_430px] 2xl:grid-cols-[minmax(0,1fr)_460px]">
        <div className="flex min-w-0 flex-col">
          <div className="sticky top-[56px] z-10 mb-3 rounded-2xl border bg-background/80 p-2 backdrop-blur-lg sm:top-[72px] sm:p-3">
            <form
              className="flex gap-1.5 sm:gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void addByCode(q, { clearQuery: true });
              }}
            >
              <div className="relative flex-1">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari produk atau scan..."
                  autoComplete="off"
                  className="h-10 rounded-xl pl-3 pr-9 text-sm sm:h-11"
                />
                {q ? (
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground"
                    onClick={() => setQ("")}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                ) : null}
              </div>
              <VoiceInputButton onProductDetected={handleVoiceProduct} />
              <Button
                type="button"
                variant="outline"
                className="h-10 w-10 rounded-xl p-0 sm:h-11 sm:w-11"
                onClick={() => setScannerOpen(true)}
                aria-label="Scan QR/Barcode"
              >
                <ScanLine className="h-4 w-4" />
              </Button>
            </form>
            <div className="mt-1.5 px-0.5 text-[11px] text-muted-foreground/70 sm:text-xs">
              {q ? `${productCount} produk ditemukan` : `${productCount} produk`}
            </div>
          </div>
          <div
            ref={gridParentRef}
            className="overflow-auto scrollbar-thin"
            style={{ maxHeight: "calc(100vh - 210px)" }}
          >
            <div
              style={{ height: `${gridVirtualizer.getTotalSize()}px`, position: "relative" }}
            >
              {gridVirtualizer.getVirtualItems().map((virtualRow) => {
                const start = virtualRow.index * colCount;
                const rowProducts = filtered.slice(start, start + colCount);
                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      willChange: "transform",
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div
                      className="grid gap-3 sm:gap-4 lg:gap-5 xl:gap-6"
                      style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
                    >
                      {rowProducts.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-10 text-sm text-muted-foreground">
                          <svg className="h-10 w-10 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.75v11.25m-3-3l3 3 3-3M3.75 18.75h16.5" />
                          </svg>
                          Produk tidak ditemukan
                        </div>
                      ) : (
                        rowProducts.map((p) => (
                          <ProductCard key={p.id} product={p} onInc={inc} showStock={settings.cartShowStock} />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Desktop cart sidebar */}
        <div className="hidden lg:block">
          <CartSidebar
            lines={lines}
            productMap={productMap}
            invoice={invoice}
            notice={notice}
            error={error}
            subtotal={subtotal}
            discount={discount}
            effectiveTaxRate={effectiveTaxRate}
            tax={tax}
            total={total}
            cashPaid={cashPaid}
            cashChange={cashChange}
            method={method}
            settings={settings}
            isPending={isPending}
            shiftCheckDone={shiftCheckDone}
            openShiftId={openShiftId}
            inc={inc}
            dec={dec}
            setError={setError}
            setNotice={setNotice}
            setMethod={setMethod}
            setCashPaid={setCashPaid}
            setDiscount={setDiscount}
            setTaxRate={setTaxRate}
            setCart={setCart}
            onPay={handlePay}
          />
        </div>

        {/* Mobile FAB cart button */}
        {cartItemCount > 0 ? (
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 xl:hidden"
          >
            <div className="flex items-center gap-2.5 rounded-full border bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all active:scale-95">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                {cartItemCount}
              </div>
              <span>Keranjang</span>
              <span className="font-bold">{rupiah(total)}</span>
            </div>
          </button>
        ) : null}

        {/* Mobile cart bottom sheet */}
        {cartOpen ? (
          <MobileCartSheet
            lines={lines}
            productMap={productMap}
            notice={notice}
            error={error}
            subtotal={subtotal}
            discount={discount}
            effectiveTaxRate={effectiveTaxRate}
            tax={tax}
            total={total}
            cashPaid={cashPaid}
            cashChange={cashChange}
            method={method}
            settings={settings}
            isPending={isPending}
            shiftCheckDone={shiftCheckDone}
            openShiftId={openShiftId}
            onClose={() => setCartOpen(false)}
            inc={inc}
            dec={dec}
            setError={setError}
            setNotice={setNotice}
            setMethod={setMethod}
            setCashPaid={setCashPaid}
            setDiscount={setDiscount}
            setTaxRate={setTaxRate}
            setCart={setCart}
            onPay={handlePay}
          />
        ) : null}

        {notice ? <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 xl:hidden"><Alert className="animate-slide-up shadow-lg">{notice}</Alert></div> : null}
        {error ? <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 xl:hidden"><Alert variant="destructive" className="animate-slide-up shadow-lg">{error}</Alert></div> : null}

        {successDialog ? (
          <TransactionSuccessDialog
            open
            onOpenChange={(v) => {
              if (!v) setSuccessDialog(null);
            }}
            invoiceNo={successDialog.invoiceNo}
            total={successDialog.total}
            subtotal={successDialog.subtotal}
            discount={successDialog.discount}
            tax={successDialog.tax}
            paymentMethod={successDialog.paymentMethod}
            receivedAmount={successDialog.receivedAmount}
            changeAmount={successDialog.changeAmount}
            items={successDialog.items}
            printing={printing}
            onPrint={() => {
              setPrinting(true);
              fetch(`/api/pos/receipt/${saleId}`)
                .then((r) => (r.ok ? r.json() : null))
                .then((json) => {
                  if (json?.ok) {
                    requestPrint(json.data.printer as PrinterSettings, json.data.sale as ReceiptSale);
                  }
                })
                .catch(console.error)
                .finally(() => {
                  setPrinting(false);
                  setSuccessDialog(null);
                });
            }}
          />
        ) : null}

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
    </ErrorBoundary>
  );
}
