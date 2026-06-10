"use client";

import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { PrinterSettings } from "@/modules/settings/printer/validators";
import { generateReceiptText, printViaBluetooth, isAndroidApp } from "@/modules/settings/printer/bluetooth";

type ReceiptSale = {
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

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function requestPrint(printer: PrinterSettings, sale: ReceiptSale) {
  if (printer.connectionType === "bluetooth") {
    const text = generateReceiptText(sale, printer);
    printViaBluetooth(text, printer.bluetoothDeviceName).catch((e) => {
      console.error(e);
      alert("Gagal print via Bluetooth: " + (e instanceof Error ? e.message : String(e)));
    });
  } else if (isAndroidApp()) {
    const text = generateReceiptText(sale, printer);
    printViaBluetooth(text).catch((e) => {
      console.error(e);
      alert("Gagal print via Bluetooth Android: " + (e instanceof Error ? e.message : String(e)));
    });
  } else {
    if (typeof window !== "undefined" && window.posDesktop?.printer && printer.defaultBrowserPrinter) {
      window.posDesktop.printer.print({ deviceName: printer.defaultBrowserPrinter, silent: true }).catch((e) => {
        console.error(e);
        alert("Gagal print via Desktop: " + (e instanceof Error ? e.message : String(e)));
      });
    } else {
      window.print();
    }
  }
}

function getWidthMm(printer: PrinterSettings): number {
  if (printer.paper === "48mm") return 48;
  if (printer.paper === "58mm") return 58;
  if (printer.paper === "80mm") return 80;
  return printer.customWidthMm ?? 58;
}

function getHeightMm(printer: PrinterSettings): number | null {
  if (printer.paper === "custom") return printer.customHeightMm ?? null;
  return null;
}

function getMaxWidthPx(printer: PrinterSettings): string {
  const w = getWidthMm(printer);
  const px = Math.round(w * 6.5);
  return `${px}px`;
}

const BASELINE_WIDTH = 80;

export function ReceiptView({
  sale,
  printer,
  autoPrint,
  showPrintButton = true,
}: {
  sale: ReceiptSale;
  printer: PrinterSettings;
  autoPrint: boolean;
  showPrintButton?: boolean;
}) {
  const widthMm = getWidthMm(printer);
  const heightMm = getHeightMm(printer);
  const scale = widthMm / BASELINE_WIDTH;

  const fontSize = useMemo(() => {
    const base = Math.round(14 * scale);
    return {
      base: `${Math.max(8, base)}px`,
      small: `${Math.max(7, Math.round(12 * scale))}px`,
      total: `${Math.max(9, Math.round(16 * scale))}px`,
      title: `${Math.max(9, Math.round(15 * scale))}px`,
    };
  }, [scale]);

  const gaps = useMemo(() => {
    return {
      hr: `${Math.max(4, Math.round(12 * scale))}px`,
      items: `${Math.max(4, Math.round(8 * scale))}px`,
      itemGap: `${Math.max(1, Math.round(2 * scale))}px`,
      rowGap: `${Math.max(4, Math.round(12 * scale))}px`,
      payGap: `${Math.max(2, Math.round(4 * scale))}px`,
    };
  }, [scale]);

  const maxWidthStr = getMaxWidthPx(printer);

  useEffect(() => {
    if (!autoPrint) return;
    const t = window.setTimeout(() => requestPrint(printer, sale), 250);
    return () => window.clearTimeout(t);
  }, [autoPrint, printer, sale]);

  const pageSizeCss = printer.paper === "custom" && heightMm
    ? `@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }`
    : `@page { size: ${widthMm}mm auto; margin: 0; }`;

  return (
    <div>
      <style>{`
        :root { color-scheme: light; }
        .receipt-wrap { max-width: ${maxWidthStr}; width: 100%; margin: 0 auto; padding: ${gaps.hr}; background: #fff; font-size: ${fontSize.base}; }
        .center { text-align: center; }
        .muted { color: #64748b; }
        .hr { border-top: 1px dashed #cbd5e1; margin: ${gaps.hr} 0; }
        .row { display: flex; justify-content: space-between; gap: ${gaps.rowGap}; }
        .items { margin-top: ${gaps.items}; display: grid; gap: ${gaps.items}; }
        .item { display: grid; gap: ${gaps.itemGap}; }
        .item-top { display: flex; justify-content: space-between; gap: ${gaps.rowGap}; }
        .small { font-size: ${fontSize.small}; }
        .bold { font-weight: 700; }
        .title { font-size: ${fontSize.title}; font-weight: 700; }
        @media print {
          ${pageSizeCss}
          body { margin: 0; background: #fff; }
          .receipt-wrap { max-width: 100%; border: none !important; border-radius: 0 !important; box-shadow: none !important; padding: ${gaps.hr}; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div
        className="receipt-wrap bg-white shadow-sm"
        style={{
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        }}
      >
        <div className="center">
          <div className="title">{printer.headerTitle}</div>
          {printer.headerSubtitle ? <div className="small muted">{printer.headerSubtitle}</div> : null}
        </div>

        <div className="hr" />

        <div className="small">
          <div className="row">
            <span>Invoice</span>
            <span className="bold">{sale.invoiceNo}</span>
          </div>
          <div className="row">
            <span>Waktu</span>
            <span>{new Date(sale.createdAt).toLocaleString("id-ID")}</span>
          </div>
          <div className="row">
            <span>Status</span>
            <span>{sale.status}</span>
          </div>
        </div>

        <div className="hr" />

        <div className="items small">
          {sale.items.map((i) => (
            <div key={i.id} className="item">
              <div className="item-top">
                <div className="bold" style={{ flex: 1, minWidth: 0 }}>
                  {i.name}
                </div>
                <div className="bold">{rupiah(i.lineTotal)}</div>
              </div>
              {printer.showUnitPriceOnReceipt || printer.showSkuOnReceipt ? (
                <div className="muted">
                  {[
                    printer.showUnitPriceOnReceipt ? `${i.qty} x ${rupiah(i.price)}` : `${i.qty} item`,
                    printer.showSkuOnReceipt ? `SKU: ${i.sku}` : null,
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="hr" />

        <div className="small">
          <div className="row">
            <span>Subtotal</span>
            <span>{rupiah(sale.subtotal)}</span>
          </div>
          {printer.showDiscount ? (
            <div className="row">
              <span>Diskon</span>
              <span>{rupiah(sale.discount)}</span>
            </div>
          ) : null}
          {printer.showTax ? (
            <div className="row">
              <span>Pajak</span>
              <span>{rupiah(sale.tax)}</span>
            </div>
          ) : null}
          <div className="row bold" style={{ marginTop: gaps.items, fontSize: fontSize.total }}>
            <span>Total</span>
            <span>{rupiah(sale.total)}</span>
          </div>
        </div>

        <div className="hr" />

        <div className="small">
          <div className="bold" style={{ marginBottom: gaps.items }}>
            Pembayaran
          </div>
          {sale.payments.length === 0 ? (
            <div className="muted">-</div>
          ) : (
            sale.payments.map((p) => (
              <div key={p.id} style={{ display: "grid", gap: gaps.payGap }}>
                <div className="row">
                  <span>Metode</span>
                  <span className="bold">{p.method}</span>
                </div>
                <div className="row">
                  <span>Dibayarkan</span>
                  <span>{rupiah(p.receivedAmount || p.amount)}</span>
                </div>
                {p.changeAmount > 0 ? (
                  <div className="row">
                    <span>Kembalian</span>
                    <span>{rupiah(p.changeAmount)}</span>
                  </div>
                ) : null}
                {p.reference ? (
                  <div className="row muted">
                    <span>Ref</span>
                    <span>{p.reference}</span>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>

        <div className="hr" />

        <div className="center small muted">{printer.footerNote}</div>

        {showPrintButton ? (
          <div className="no-print mt-4 flex justify-center gap-2">
            <Button type="button" className="rounded-xl" onClick={() => requestPrint(printer, sale)}>
              Cetak
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
