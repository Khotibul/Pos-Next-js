"use client";

import { useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { CartLineItem, CartSummary, CartActions } from "./cart-common";
import { SavedCartsPanel } from "./saved-carts-panel";
import type { CartLine, Product, PaymentMethod } from "./cart-common";
import type { PrinterSettings } from "@/modules/settings/printer/validators";

export function CartSidebar({
  lines, productMap, invoice, notice, error, subtotal, discount, effectiveTaxRate, tax, total,
  cashPaid, cashChange, method, settings, isPending, shiftCheckDone, openShiftId,
  inc, dec, setError, setNotice, setMethod, setCashPaid, setDiscount, setTaxRate, setCart,
  onPay,
}: {
  lines: CartLine[];
  productMap: Map<string, Product>;
  invoice: string | null; notice: string | null; error: string | null;
  subtotal: number; discount: number; effectiveTaxRate: number; tax: number; total: number;
  cashPaid: number; cashChange: number; method: PaymentMethod;
  settings: PrinterSettings; isPending: boolean; shiftCheckDone: boolean; openShiftId: string | null;
  inc: (id: string) => void; dec: (id: string) => void;
  setError: (v: string | null) => void; setNotice: (v: string | null) => void;
  setMethod: (v: PaymentMethod) => void; setCashPaid: (v: number) => void;
  setDiscount: (v: number) => void; setTaxRate: (v: number) => void;
  setCart: (v: Record<string, number>) => void;
  onPay: () => void;
}) {
  const sidebarRef = useRef<HTMLDivElement>(null);

  return (
    <Card ref={sidebarRef} className="sticky top-[72px] flex min-h-0 flex-col overflow-hidden rounded-3xl xl:max-h-[calc(100vh-96px)]">
      <CardHeader className="shrink-0 border-b py-3.5">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold">Keranjang</CardTitle>
          {invoice ? <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{invoice}</span> : null}
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3">
        {notice ? <Alert className="py-2 text-sm">{notice}</Alert> : null}
        {error ? <Alert variant="destructive" className="py-2 text-sm">{error}</Alert> : null}

        <div className="min-h-[100px] flex-1 overflow-y-auto">
          <div className="grid gap-1.5">
          {lines.length === 0 ? (
            <div className="flex items-center justify-center rounded-xl border-2 border-dashed p-6 text-sm text-muted-foreground">
              <div className="text-center">
                <svg className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
                Belum ada item
              </div>
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

        <SavedCartsPanel cart={lines.reduce((acc, l) => ({ ...acc, [l.productId]: l.qty }), {} as Record<string, number>)} productMap={productMap} setCart={setCart} setNotice={setNotice} />

        <CartSummary subtotal={subtotal} discount={discount} effectiveTaxRate={effectiveTaxRate} tax={tax} total={total} settings={settings} cashPaid={cashPaid} cashChange={cashChange} cashShortage={cashChange > 0 ? 0 : Math.max(0, total - cashPaid)} method={method} setDiscount={setDiscount} setTaxRate={setTaxRate} setMethod={setMethod} setCashPaid={setCashPaid} />

        <CartActions isPending={isPending} lines={lines} shiftCheckDone={shiftCheckDone} openShiftId={openShiftId} method={method} cashPaid={cashPaid} total={total} onPay={onPay} onCancel={() => { setCart({}); setError(null); setNotice(null); }} />
      </CardContent>
    </Card>
  );
}
