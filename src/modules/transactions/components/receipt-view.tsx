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

const FONT_MULTIPLIER: Record<string, number> = {
  small: 0.85,
  medium: 1,
  large: 1.2,
};

const PAPER_SPECS: Record<string, { charsPerLine: number; baseFont: number; titleFont: number }> = {
  "48mm": { charsPerLine: 24, baseFont: 10, titleFont: 12 },
  "58mm": { charsPerLine: 32, baseFont: 11, titleFont: 13 },
  "80mm": { charsPerLine: 48, baseFont: 13, titleFont: 15 },
};

function mul(val: number, mult: number) {
  return Math.max(7, Math.round(val * mult));
}

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
  const fontMult = FONT_MULTIPLIER[printer.receiptFontSize ?? "medium"] ?? 1;

  const specs = useMemo(
    () => PAPER_SPECS[printer.paper] ?? { charsPerLine: Math.round(widthMm * 0.6), baseFont: 11, titleFont: 13 },
    [printer.paper, widthMm],
  );

  const fontSize = useMemo(() => {
    return {
      base: `${mul(specs.baseFont, fontMult)}px`,
      small: `${mul(specs.baseFont - 2, fontMult)}px`,
      total: `${mul(specs.baseFont + 4, fontMult)}px`,
      title: `${mul(specs.titleFont, fontMult)}px`,
    };
  }, [specs, fontMult]);

  const gaps = useMemo(() => {
    return {
      hr: `${Math.max(6, Math.round(widthMm * 0.2 * fontMult))}px`,
      itemGap: `${Math.max(3, Math.round(widthMm * 0.06 * fontMult))}px`,
      rowGap: `${Math.max(3, Math.round(widthMm * 0.08 * fontMult))}px`,
      payGap: `${Math.max(2, Math.round(widthMm * 0.06 * fontMult))}px`,
    };
  }, [widthMm, fontMult]);

  const maxWidthPx = getMaxWidthPx(printer);

  useEffect(() => {
    if (!autoPrint) return;
    const t = window.setTimeout(() => requestPrint(printer, sale), 250);
    return () => window.clearTimeout(t);
  }, [autoPrint, printer, sale]);

  const pageSizeCss = printer.paper === "custom" && heightMm
    ? `@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }`
    : `@page { size: ${widthMm}mm auto; margin: 0; }`;

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
          line-height: 1.5;
          font-family: 'Courier New', 'Lucida Console', 'Liberation Mono', 'Noto Mono', monospace;
          color: #000;
        }
        .center { text-align: center; }
        .muted { color: #64748b; }
        .hr-line {
          border: none;
          height: 1px;
          background: #94a3b8;
          margin: ${gaps.hr} 0;
        }
        .hr-line-dash {
          border: none;
          height: 1px;
          background: repeating-linear-gradient(
            to right,
            #94a3b8 0,
            #94a3b8 3px,
            transparent 3px,
            transparent 6px
          );
          margin: ${gaps.hr} 0;
        }
        .row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: ${gaps.rowGap};
          margin-bottom: ${gaps.itemGap};
        }
        .item-grid { display: grid; gap: ${gaps.itemGap}; }
        .item-line {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: ${gaps.rowGap};
        }
        .item-name {
          flex: 1;
          word-break: break-word;
          font-weight: 600;
        }
        .item-name-long {
          word-break: break-word;
          font-weight: 600;
        }
        .item-total {
          white-space: nowrap;
          font-weight: 600;
          text-align: right;
        }
        .item-detail {
          display: flex;
          gap: 0.6em;
          flex-wrap: wrap;
          padding-left: 0.5em;
        }
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
          body.print-receipt .receipt-print-root {
            display: block !important;
          }
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
          .hr-line { margin: 1.5mm 0; }
          .hr-line-dash { margin: 1.5mm 0; }
          .row { margin-bottom: 0.5mm; }
          .item-grid { gap: 0.5mm; }
        }
      `}</style>

      <div className="receipt-print-root">
      <div className="receipt-wrap" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div className="center">
          <div className="title">{printer.headerTitle}</div>
          {printer.headerSubtitle ? <div className="small muted">{printer.headerSubtitle}</div> : null}
        </div>

        <hr className="hr-line" />

        <div className="small">
          <div className="row">
            <span className="muted">Invoice</span>
            <span className="bold">{sale.invoiceNo}</span>
          </div>
          <div className="row">
            <span className="muted">Waktu</span>
            <span>{new Date(sale.createdAt).toLocaleString("id-ID")}</span>
          </div>
          <div className="row">
            <span className="muted">Status</span>
            <span>{sale.status}</span>
          </div>
        </div>

        <hr className="hr-line" />

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

        <hr className="hr-line" />

        <div className="small">
          <div className="row">
            <span className="muted">Subtotal</span>
            <span>{rupiah(sale.subtotal)}</span>
          </div>
          {printer.showDiscount && sale.discount > 0 ? (
            <div className="row">
              <span className="muted">Diskon</span>
              <span>{rupiah(sale.discount)}</span>
            </div>
          ) : null}
          {printer.showTax && sale.tax > 0 ? (
            <div className="row">
              <span className="muted">Pajak</span>
              <span>{rupiah(sale.tax)}</span>
            </div>
          ) : null}
          <div className="row bold" style={{ fontSize: fontSize.total, marginTop: gaps.itemGap }}>
            <span>Total</span>
            <span>{rupiah(sale.total)}</span>
          </div>
        </div>

        <hr className="hr-line" />

        <div className="small">
          <div className="bold" style={{ marginBottom: gaps.itemGap }}>Pembayaran</div>
          {sale.payments.length === 0 ? (
            <div className="muted">-</div>
          ) : (
            sale.payments.map((p) => (
              <div key={p.id} className="pay-grid">
                <div className="row">
                  <span className="muted">Metode</span>
                  <span className="bold">{p.method}</span>
                </div>
                <div className="row">
                  <span className="muted">Dibayar</span>
                  <span>{rupiah(p.receivedAmount || p.amount)}</span>
                </div>
                {p.changeAmount > 0 ? (
                  <div className="row">
                    <span className="muted">Kembali</span>
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

        <hr className="hr-line-dash" />

        <div className="center small">{printer.footerNote}</div>

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
