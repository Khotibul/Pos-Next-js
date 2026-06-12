"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { PrinterSettings } from "@/modules/settings/printer/validators";
import { generateReceiptText, printViaBluetooth, isAndroidApp } from "@/modules/settings/printer/bluetooth";
import {
  formatReceiptCurrency,
  getBaseFontPx,
  getPaperProfile,
  getReceiptDensity,
  getTitleFontPx,
  truncateText,
} from "@/modules/settings/printer/print-engine";

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

function cleanupPrintClass() {
  if (typeof document !== "undefined") document.body.classList.remove("print-receipt");
}

function printBrowserReceipt() {
  document.body.classList.add("print-receipt");
  const cleanup = () => cleanupPrintClass();
  window.addEventListener("afterprint", cleanup, { once: true });
  window.print();
  window.setTimeout(cleanup, 1600);
}

function requestPrint(printer: PrinterSettings, sale: ReceiptSale) {
  if (printer.connectionType === "bluetooth" || isAndroidApp()) {
    const text = generateReceiptText(sale, printer);
    printViaBluetooth(text, printer.bluetoothDeviceName).catch((e) => {
      console.error(e);
      alert("Gagal print via Bluetooth: " + (e instanceof Error ? e.message : String(e)));
    });
    return;
  }

  if (typeof window !== "undefined" && window.posDesktop?.printer && printer.defaultBrowserPrinter) {
    document.body.classList.add("print-receipt");
    window.posDesktop.printer
      .print({ deviceName: printer.defaultBrowserPrinter, silent: true })
      .catch((e) => {
        console.error(e);
        window.print();
      })
      .finally(() => window.setTimeout(cleanupPrintClass, 800));
    return;
  }

  printBrowserReceipt();
}

function paymentLabel(method: string) {
  const normalized = method.toUpperCase();
  if (normalized === "CASH") return "Tunai";
  if (normalized === "QRIS") return "QRIS";
  if (normalized === "TRANSFER") return "Transfer";
  if (normalized === "EWALLET") return "E-Wallet";
  if (normalized === "CARD") return "Kartu";
  return method;
}

export const ReceiptView = memo(function ReceiptView({
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
  const profile = useMemo(() => getPaperProfile(printer), [printer]);
  const density = useMemo(() => getReceiptDensity(printer), [printer]);
  const baseFontPx = useMemo(() => getBaseFontPx(printer, profile), [printer, profile]);
  const titleFontPx = useMemo(() => getTitleFontPx(printer, profile), [printer, profile]);
  const smallFontPx = Math.max(9, Math.round((baseFontPx - 1.4) * 10) / 10);
  const totalFontPx = Math.round((baseFontPx + 2.2) * 10) / 10;
  const itemNameChars = Math.max(12, Math.round(profile.charsPerLine * 0.52));

  useEffect(() => {
    if (!autoPrint) return;
    const timer = window.setTimeout(() => requestPrint(printer, sale), 200);
    return () => window.clearTimeout(timer);
  }, [autoPrint, printer, sale]);

  const pageSizeCss =
    printer.paper === "custom" && printer.customHeightMm
      ? `@page { size: ${profile.widthMm}mm ${printer.customHeightMm}mm; margin: 0; }`
      : `@page { size: ${profile.widthMm}mm auto; margin: 0; }`;

  return (
    <div ref={ref}>
      <style>{`
        :root { color-scheme: light; }
        .receipt-print-root {
          --receipt-width-px: ${profile.widthPx}px;
          --receipt-width-mm: ${profile.widthMm}mm;
          --receipt-padding: ${density.paddingMm}mm;
          --receipt-gap: ${density.sectionGapPx}px;
          --receipt-item-gap: ${density.itemGapPx}px;
          --receipt-line-height: ${density.lineHeight};
          --receipt-font: ${baseFontPx}px;
          --receipt-small-font: ${smallFontPx}px;
          --receipt-title-font: ${titleFontPx}px;
          --receipt-total-font: ${totalFontPx}px;
          --receipt-logo-width: ${profile.logoMaxWidthPx}px;
          --receipt-qr-size: ${profile.qrSizePx}px;
          --receipt-barcode-width: ${profile.barcodeWidthPx}px;
          width: var(--receipt-width-px);
          max-width: 100%;
          margin: 0 auto;
        }
        .receipt-wrap {
          box-sizing: border-box;
          width: var(--receipt-width-px);
          max-width: 100%;
          margin: 0 auto;
          padding: var(--receipt-padding);
          background: #fff;
          color: #000;
          font-family: Inter, "Roboto Mono", "Courier New", monospace;
          font-size: var(--receipt-font);
          line-height: var(--receipt-line-height);
          letter-spacing: -0.01em;
          overflow: hidden;
        }
        .receipt-logo {
          display: block;
          width: auto;
          max-width: var(--receipt-logo-width);
          max-height: 42px;
          object-fit: contain;
          margin: 0 auto 2px;
        }
        .receipt-center { text-align: center; }
        .receipt-muted { color: #334155; }
        .receipt-title {
          font-size: var(--receipt-title-font);
          font-weight: 800;
          line-height: 1.1;
        }
        .receipt-small { font-size: var(--receipt-small-font); }
        .receipt-bold { font-weight: 800; }
        .receipt-section { margin: var(--receipt-gap) 0; }
        .receipt-header-section { margin: calc(var(--receipt-gap) / 2) 0; }
        .receipt-separator {
          height: 1px;
          margin: var(--receipt-gap) 0;
          background: repeating-linear-gradient(to right, #000 0, #000 4px, transparent 4px, transparent 7px);
          border: 0;
        }
        .receipt-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 6px;
          margin: 0 0 var(--receipt-item-gap);
        }
        .receipt-row > span:first-child { min-width: 0; }
        .receipt-row > span:last-child {
          flex-shrink: 0;
          text-align: right;
        }
        .receipt-items {
          display: grid;
          gap: calc(var(--receipt-item-gap) + 1px);
          font-size: var(--receipt-small-font);
        }
        .receipt-item-main {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: baseline;
          gap: 6px;
        }
        .receipt-item-name {
          min-width: 0;
          overflow: hidden;
          font-weight: 700;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .receipt-item-total {
          font-family: "Roboto Mono", "Courier New", monospace;
          font-weight: 800;
          text-align: right;
          white-space: nowrap;
        }
        .receipt-item-detail {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 2px 6px;
          padding-left: 2px;
          color: #334155;
        }
        .receipt-total {
          font-size: var(--receipt-total-font);
          font-weight: 900;
        }
        .receipt-qr {
          width: var(--receipt-qr-size);
          height: var(--receipt-qr-size);
          margin: 2px auto;
        }
        .receipt-barcode {
          width: var(--receipt-barcode-width);
          max-width: 100%;
          margin: 2px auto;
          overflow: hidden;
        }
        .receipt-footer-feed {
          white-space: pre-line;
          height: ${Math.max(4, density.footerFeedLines * 5)}px;
        }
        @media print {
          ${pageSizeCss}
          html, body {
            width: var(--receipt-width-mm);
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          body.print-receipt * { visibility: hidden !important; }
          body.print-receipt .receipt-print-root,
          body.print-receipt .receipt-print-root * { visibility: visible !important; }
          body.print-receipt .receipt-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: var(--receipt-width-mm);
            max-width: var(--receipt-width-mm);
            margin: 0;
          }
          .receipt-wrap {
            width: var(--receipt-width-mm);
            max-width: var(--receipt-width-mm);
            padding: var(--receipt-padding);
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="receipt-print-root">
        <div className="receipt-wrap rounded-xl border shadow-sm">
          <div className="receipt-center receipt-header-section">
            {printer.showLogo ? (
              <Image src="/posqu-pro.png" alt="Logo toko" width={profile.logoMaxWidthPx} height={42} className="receipt-logo" priority={false} />
            ) : null}
            <div className="receipt-title">{printer.headerTitle}</div>
            {printer.headerSubtitle ? <div className="receipt-small receipt-muted">{printer.headerSubtitle}</div> : null}
          </div>

          <hr className="receipt-separator" />

          <div className="receipt-small receipt-section">
            <div className="receipt-row">
              <span className="receipt-muted">Invoice</span>
              <span className="receipt-bold">{sale.invoiceNo}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-muted">Tanggal</span>
              <span>{new Date(sale.createdAt).toLocaleString("id-ID")}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-muted">Status</span>
              <span>{sale.status}</span>
            </div>
          </div>

          <hr className="receipt-separator" />

          <div className="receipt-items receipt-section">
            {sale.items.map((item) => (
              <div key={item.id}>
                <div className="receipt-item-main">
                  <div className="receipt-item-name" title={item.name}>{truncateText(item.name, itemNameChars)}</div>
                  <div className="receipt-item-total">{formatReceiptCurrency(item.lineTotal)}</div>
                </div>
                {printer.receiptMode !== "compact" || printer.showUnitPriceOnReceipt || printer.showSkuOnReceipt ? (
                  <div className="receipt-item-detail">
                    <span>{item.qty} x {formatReceiptCurrency(item.price)}</span>
                    {printer.showSkuOnReceipt && item.sku ? <span>SKU: {item.sku}</span> : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <hr className="receipt-separator" />

          <div className="receipt-small receipt-section">
            <div className="receipt-row">
              <span className="receipt-muted">Subtotal</span>
              <span>{formatReceiptCurrency(sale.subtotal)}</span>
            </div>
            {printer.showDiscount && sale.discount > 0 ? (
              <div className="receipt-row">
                <span className="receipt-muted">Diskon</span>
                <span>-{formatReceiptCurrency(sale.discount)}</span>
              </div>
            ) : null}
            {printer.showTax && sale.tax > 0 ? (
              <div className="receipt-row">
                <span className="receipt-muted">Pajak</span>
                <span>{formatReceiptCurrency(sale.tax)}</span>
              </div>
            ) : null}
            <div className="receipt-row receipt-total">
              <span>Total</span>
              <span>{formatReceiptCurrency(sale.total)}</span>
            </div>
          </div>

          <hr className="receipt-separator" />

          <div className="receipt-small receipt-section">
            <div className="receipt-bold">Pembayaran</div>
            {sale.payments.length === 0 ? (
              <div className="receipt-muted">-</div>
            ) : (
              sale.payments.map((payment) => (
                <div key={payment.id}>
                  <div className="receipt-row">
                    <span className="receipt-muted">Metode</span>
                    <span className="receipt-bold">{paymentLabel(payment.method)}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="receipt-muted">Dibayar</span>
                    <span>{formatReceiptCurrency(payment.receivedAmount || payment.amount)}</span>
                  </div>
                  {payment.changeAmount > 0 ? (
                    <div className="receipt-row">
                      <span className="receipt-muted">Kembali</span>
                      <span>{formatReceiptCurrency(payment.changeAmount)}</span>
                    </div>
                  ) : null}
                  {printer.receiptMode === "detailed" && payment.reference ? (
                    <div className="receipt-row receipt-muted">
                      <span>Ref</span>
                      <span>{payment.reference}</span>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <hr className="receipt-separator" />

          <div className="receipt-center receipt-small receipt-section">{printer.footerNote}</div>
          <div className="receipt-footer-feed" aria-hidden="true" />

          {showPrintButton ? (
            <div className="no-print receipt-center" style={{ marginTop: 8 }}>
              <Button type="button" className="rounded-xl" onClick={() => requestPrint(printer, sale)}>
                Cetak
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
});
