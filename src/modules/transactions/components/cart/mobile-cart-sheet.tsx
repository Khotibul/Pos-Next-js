"use client";

import { useRef } from "react";
import { Alert } from "@/components/ui/alert";
import { CartLineItem, CartSummary, CartActions } from "./cart-common";
import { SavedCartsPanel } from "./saved-carts-panel";
import type { CartLine, Product, PaymentMethod } from "./cart-common";
import type { PrinterSettings } from "@/modules/settings/printer/validators";

export function MobileCartSheet({
  lines, productMap, notice, error, subtotal, discount, effectiveTaxRate, tax, total,
  cashPaid, cashChange, method, settings, isPending, shiftCheckDone, openShiftId,
  onClose,
  inc, dec, setError, setNotice, setMethod, setCashPaid, setDiscount, setTaxRate, setCart,
  onPay,
}: {
  lines: CartLine[];
  productMap: Map<string, Product>;
  notice: string | null; error: string | null;
  subtotal: number; discount: number; effectiveTaxRate: number; tax: number; total: number;
  cashPaid: number; cashChange: number; method: PaymentMethod;
  settings: PrinterSettings; isPending: boolean; shiftCheckDone: boolean; openShiftId: string | null;
  onClose: () => void;
  inc: (id: string) => void; dec: (id: string) => void;
  setError: (v: string | null) => void; setNotice: (v: string | null) => void;
  setMethod: (v: PaymentMethod) => void; setCashPaid: (v: number) => void;
  setDiscount: (v: number) => void; setTaxRate: (v: number) => void;
  setCart: (v: Record<string, number>) => void;
  onPay: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm xl:hidden" onClick={onClose} />
      <div
        ref={sheetRef}
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-3xl border bg-background pb-safe xl:hidden animate-slide-up"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Keranjang</span>
            {lines.length > 0 ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {lines.length}
              </span>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/60">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {notice ? <Alert className="mb-3 py-2 text-sm">{notice}</Alert> : null}
          {error ? <Alert variant="destructive" className="mb-3 py-2 text-sm">{error}</Alert> : null}

          <div className="grid gap-1.5">
            {lines.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
                <svg className="mb-2 h-10 w-10 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
                Keranjang kosong
              </div>
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

        <div className="shrink-0 border-t bg-background px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
          <div className="grid gap-3">
            <SavedCartsPanel cart={lines.reduce((acc, l) => ({ ...acc, [l.productId]: l.qty }), {} as Record<string, number>)} productMap={productMap} setCart={(v) => { setCart(v); onClose(); }} setNotice={setNotice} />
            <CartSummary subtotal={subtotal} discount={discount} effectiveTaxRate={effectiveTaxRate} tax={tax} total={total} settings={settings} cashPaid={cashPaid} cashChange={cashChange} cashShortage={cashChange > 0 ? 0 : Math.max(0, total - cashPaid)} method={method} setDiscount={setDiscount} setTaxRate={setTaxRate} setMethod={setMethod} setCashPaid={setCashPaid} />
            <CartActions isPending={isPending} lines={lines} shiftCheckDone={shiftCheckDone} openShiftId={openShiftId} method={method} cashPaid={cashPaid} total={total} onPay={onPay} onCancel={() => { setCart({}); setError(null); setNotice(null); onClose(); }} />
          </div>
        </div>
      </div>
    </>
  );
}
