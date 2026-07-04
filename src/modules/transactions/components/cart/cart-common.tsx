"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import type { PrinterSettings } from "@/modules/settings/printer/validators";

export type PaymentMethod = "CASH" | "QRIS" | "TRANSFER" | "EWALLET" | "CARD";

export type CartLine = {
  productId: string;
  name: string;
  sku: string;
  price: number;
  qty: number;
  lineTotal: number;
  isWholesale?: boolean;
};

export type Product = {
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

export function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export const CartLineItem = memo(function CartLineItem({
  item,
  onInc,
  onDec,
}: {
  item: CartLine;
  product: Product | undefined;
  onInc: (id: string) => void;
  onDec: (id: string) => void;
  showSku: boolean;
  showStock: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-2.5 transition-all hover:bg-muted/60 sm:p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
        {item.qty}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium leading-tight">{item.name}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {rupiah(item.price)} / unit
          {item.isWholesale ? <span className="ml-1 text-orange-600">Grosir</span> : null}
        </div>
        <div className="text-xs font-semibold text-primary">{rupiah(item.lineTotal)}</div>
      </div>
      <div className="flex items-center gap-1">
        <Button type="button" variant="outline" size="sm" className="h-8 w-8 rounded-lg p-0 text-base" onClick={() => onDec(item.productId)}>
          −
        </Button>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
          {item.qty}
        </div>
        <Button type="button" variant="outline" size="sm" className="h-8 w-8 rounded-lg p-0 text-base" onClick={() => onInc(item.productId)}>
          +
        </Button>
      </div>
    </div>
  );
});

export function CartSummary({
  subtotal, discount, effectiveTaxRate, tax, total, settings,
  cashPaid, cashChange, cashShortage, method,
  setDiscount, setTaxRate, setMethod, setCashPaid,
}: {
  subtotal: number; discount: number; effectiveTaxRate: number; tax: number; total: number;
  settings: PrinterSettings; cashPaid: number; cashChange: number; cashShortage: number; method: PaymentMethod;
  setDiscount: (v: number) => void; setTaxRate: (v: number) => void; setMethod: (v: PaymentMethod) => void; setCashPaid: (v: number) => void;
}) {
  return (
    <>
      <div className="shrink-0 rounded-xl bg-muted/30 p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{rupiah(subtotal)}</span>
        </div>
        {settings.cartShowDiscount ? (
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Diskon</span>
          <input
            type="number"
            className="h-9 w-32 rounded-lg border bg-background px-2.5 text-right text-sm"
            value={discount}
            min={0}
            onChange={(e) => setDiscount(Number(e.target.value || 0))}
          />
        </div>
        ) : null}
        {settings.cartShowTax ? (
        <>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Pajak (%)</span>
            <input
              type="number"
              className="h-9 w-20 rounded-lg border bg-background px-2.5 text-right text-sm"
              value={effectiveTaxRate}
              min={0}
              max={100}
              onChange={(e) => setTaxRate(Number(e.target.value || 0))}
            />
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-muted-foreground">Pajak</span>
            <span>{rupiah(tax)}</span>
          </div>
        </>
        ) : null}
        <div className="mt-3 flex justify-between border-t pt-3 text-base">
          <span className="font-semibold">Total</span>
          <span className="text-lg font-bold text-primary">{rupiah(total)}</span>
        </div>
      </div>

      <div className="shrink-0">
        <div className="mb-2 text-xs font-medium text-muted-foreground">Metode Pembayaran</div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { k: "CASH" as PaymentMethod, label: "Tunai" },
            { k: "QRIS" as PaymentMethod, label: "QRIS" },
            { k: "CARD" as PaymentMethod, label: "Kartu" },
            { k: "TRANSFER" as PaymentMethod, label: "Transfer" },
            { k: "EWALLET" as PaymentMethod, label: "E-Wallet" },
          ].map((m) => (
            <button
              key={m.k}
              type="button"
              onClick={() => { setMethod(m.k); setCashPaid(0); }}
              className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                method === m.k
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {method === "CASH" ? (
        <div className="shrink-0 rounded-lg bg-muted/30 p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Dibayar</span>
            <input
              type="number"
              inputMode="numeric"
              className="h-9 w-36 rounded-lg border bg-background px-2.5 text-right text-sm"
              value={Number.isFinite(cashPaid) ? cashPaid : 0}
              min={0}
              onChange={(e) => setCashPaid(Number(e.target.value || 0))}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-muted-foreground">Kembalian</span>
            <span className={cashShortage > 0 ? "font-semibold text-destructive" : "font-semibold text-primary"}>
              {cashShortage > 0 ? `Kurang ${rupiah(cashShortage)}` : rupiah(cashChange)}
            </span>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function CartActions({
  isPending, lines, shiftCheckDone, openShiftId, method, cashPaid, total,
  onPay,
  onCancel,
}: {
  isPending: boolean; lines: Array<{ productId: string; qty: number }>; shiftCheckDone: boolean; openShiftId: string | null;
  method: PaymentMethod; cashPaid: number; total: number;
  onPay: () => void; onCancel: () => void;
}) {
  return (
    <div className="shrink-0 flex gap-2">
      <Button type="button" variant="secondary" className="flex-1 rounded-xl" disabled={isPending} onClick={onCancel}>
        Batal
      </Button>
      <Button
        type="button"
        className="flex-1 rounded-xl"
        disabled={isPending || lines.length === 0 || (shiftCheckDone && !openShiftId) || (method === "CASH" && cashPaid < total)}
        onClick={onPay}
      >
        {isPending ? (
          <span className="flex items-center gap-2"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Memproses</span>
        ) : shiftCheckDone && !openShiftId ? "Buka Shift" : `Bayar ${rupiah(total)}`}
      </Button>
    </div>
  );
}
