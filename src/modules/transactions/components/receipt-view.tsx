"use client";

import { useEffect, useMemo, useRef } from "react";
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
  const px = Math.round(w * 3.78);
  return `${px}px`;
}

const PAPER_SPECS: Record<string, { charsPerLine: number; baseFont: number; titleFont: number }> = {
  "48mm": { charsPerLine: 24, baseFont: 11, titleFont: 13 },
  "58mm": { charsPerLine: 32, baseFont: 12, titleFont: 14 },
  "80mm": { charsPerLine: 48, baseFont: 14, titleFont: 16 },
};

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
  const ref = useRef<HTMLDivElement>(null);
  const widthMm = getWidthMm(printer);
  const heightMm = getHeightMm(printer);
  const specs = useMemo(
    () => PAPER_SPECS[printer.paper] ?? { charsPerLine: Math.round(widthMm * 0.6), baseFont: 12, titleFont: 14 },
    [printer.paper, widthMm],
  );

  const fontSize = useMemo(() => {
    return {
      base: `${specs.baseFont}px`,
      small: `${Math.max(9, specs.baseFont - 1)}px`,
      total: `${specs.baseFont + 3}px`,
      title: `${specs.titleFont}px`,
    };
  }, [specs]);

  const gaps = useMemo(() => {
    return {
      hr: `${Math.max(6, Math.round(widthMm * 0.2))}px`,
      itemGap: `${Math.max(2, Math.round(widthMm * 0.05))}px`,
      rowGap: `${Math.max(4, Math.round(widthMm * 0.12))}px`,
      payGap: `${Math.max(2, Math.round(widthMm * 0.06))}px`,
    };
  }, [widthMm]);

  const maxWidthPx = getMaxWidthPx(printer);
  const lineChars = specs.charsPerLine;

  useEffect(() => {
    if (!autoPrint) return;
    const t = window.setTimeout(() => requestPrint(printer, sale), 250);
    return () => window.clearTimeout(t);
  }, [autoPrint, printer, sale]);

  const pageSizeCss = printer.paper === "custom" && heightMm
    ? `@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }`
    : `@page { size: ${widthMm}mm auto; margin: 0; }`;

  const hr = "\u2500".repeat(lineChars);

  return (
    <div ref={ref}>
      <style>{`
        :root { color-scheme: light; }
        .receipt-wrap {
          max-width: ${maxWidthPx};
          width: 100%;
          margin: 0 auto;
          padding: ${gaps.hr};
          background: #fff;
          font-size: ${fontSize.base};
          line-height: 1.35;
          font-family: 'Courier New', 'Lucida Console', 'Liberation Mono', 'Noto Mono', monospace;
          word-break: break-all;
        }
        .center { text-align: center; }
        .muted { color: #64748b; }
        .hr {
          border: none;
          margin: ${gaps.hr} 0;
          font-size: ${fontSize.small};
          letter-spacing: 0;
          white-space: pre;
          text-align: center;
        }
        .row {
          display: flex;
          justify-content: space-between;
          gap: ${gaps.rowGap};
          margin-bottom: ${gaps.itemGap};
        }
        .row-end { text-align: right; white-space: nowrap; }
        .row-start { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .item-grid { display: grid; gap: ${gaps.itemGap}; }
        .item-line { display: flex; justify-content: space-between; gap: ${gaps.rowGap}; }
        .item-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
        .item-total { white-space: nowrap; font-weight: 600; }
        .item-detail { display: flex; gap: 0.4em; flex-wrap: wrap; }
        .item-detail span { white-space: nowrap; }
        .small { font-size: ${fontSize.small}; }
        .bold { font-weight: 700; }
        .title { font-size: ${fontSize.title}; font-weight: 700; }
        .pay-grid { display: grid; gap: ${gaps.payGap}; }
        @media print {
          ${pageSizeCss}
          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
            width: ${widthMm}mm;
          }
          body > *:not(.receipt-print-root) { display: none !important; }
          .receipt-print-root { display: block !important; }
          .receipt-wrap {
            max-width: ${widthMm}mm;
            width: ${widthMm}mm;
            margin: 0;
            padding: 2mm 3mm;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            font-size: ${fontSize.small};
          }
          .no-print { display: none !important; }
          .hr { margin: 1.5mm 0; }
          .row { margin-bottom: 0.5mm; }
          .item-grid { gap: 0.5mm; }
        }
      `}</style>

      <div className="receipt-print-root">
      <div className="receipt-wrap shadow-sm">
        <div className="center">
          <div className="title">{printer.headerTitle}</div>
          {printer.headerSubtitle ? <div className="small muted">{printer.headerSubtitle}</div> : null}
        </div>

        <div className="hr">{hr}</div>

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

        <div className="hr">{hr}</div>

        <div className="item-grid small">
          {sale.items.map((i) => (
            <div key={i.id}>
              <div className="item-line">
                <div className="item-name">{i.name}</div>
                <div className="item-total">{rupiah(i.lineTotal)}</div>
              </div>
              {printer.showUnitPriceOnReceipt || printer.showSkuOnReceipt ? (
                <div className="item-detail muted">
                  {printer.showUnitPriceOnReceipt ? <span>{i.qty} x {rupiah(i.price)}</span> : <span>{i.qty} item</span>}
                  {printer.showSkuOnReceipt ? <span>SKU: {i.sku}</span> : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="hr">{hr}</div>

        <div className="small">
          <div className="row">
            <span>Subtotal</span>
            <span>{rupiah(sale.subtotal)}</span>
          </div>
          {printer.showDiscount && sale.discount > 0 ? (
            <div className="row">
              <span>Diskon</span>
              <span>{rupiah(sale.discount)}</span>
            </div>
          ) : null}
          {printer.showTax && sale.tax > 0 ? (
            <div className="row">
              <span>Pajak</span>
              <span>{rupiah(sale.tax)}</span>
            </div>
          ) : null}
          <div className="row bold" style={{ fontSize: fontSize.total, marginTop: gaps.itemGap }}>
            <span>Total</span>
            <span>{rupiah(sale.total)}</span>
          </div>
        </div>

        <div className="hr">{hr}</div>

        <div className="small">
          <div className="bold" style={{ marginBottom: gaps.itemGap }}>Pembayaran</div>
          {sale.payments.length === 0 ? (
            <div className="muted">-</div>
          ) : (
            sale.payments.map((p) => (
              <div key={p.id} className="pay-grid">
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

        <div className="hr">{hr}</div>

        <div className="center small muted">{printer.footerNote}</div>

        {showPrintButton ? (
          <div className="no-print" style={{ marginTop: gaps.hr, textAlign: "center" }}>
            <Button type="button" className="rounded-xl" onClick={() => requestPrint(printer, sale)}>
              Cetak
            </Button>
          </div>
        ) : null}
      </div>
      </div>
    </div>
  );
}
