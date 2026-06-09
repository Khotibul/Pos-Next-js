"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { PrinterSettings } from "@/modules/settings/printer/validators";
import { generateReceiptText, printViaBluetooth } from "@/modules/settings/printer/bluetooth";

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
  } else {
    window.print();
  }
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
  const widthMm = printer.paper === "58mm" ? 58 : 80;
  const maxPx = printer.paper === "58mm" ? 360 : 520;

  useEffect(() => {
    if (!autoPrint) return;
    const t = window.setTimeout(() => requestPrint(printer, sale), 250);
    return () => window.clearTimeout(t);
  }, [autoPrint, printer, sale]);

  return (
    <div>
      <style>{`
        :root { color-scheme: light; }
        .receipt-wrap { max-width: ${maxPx}px; margin: 0 auto; padding: 16px; }
        .center { text-align: center; }
        .muted { color: #64748b; }
        .hr { border-top: 1px dashed #cbd5e1; margin: 12px 0; }
        .row { display: flex; justify-content: space-between; gap: 12px; }
        .items { margin-top: 8px; display: grid; gap: 8px; }
        .item { display: grid; gap: 2px; }
        .item-top { display: flex; justify-content: space-between; gap: 10px; }
        .small { font-size: 12px; }
        .bold { font-weight: 700; }
        @media print {
          @page { size: ${widthMm}mm auto; margin: 0; }
          body { margin: 0; background: #fff; }
          .receipt-wrap { padding: 10px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div
        className="receipt-wrap rounded-2xl border bg-white"
        style={{
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        }}
      >
        <div className="center">
          <div className="bold">{printer.headerTitle}</div>
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
          <div className="row bold" style={{ marginTop: 8, fontSize: 14 }}>
            <span>Total</span>
            <span>{rupiah(sale.total)}</span>
          </div>
        </div>

        <div className="hr" />

        <div className="small">
          <div className="bold" style={{ marginBottom: 6 }}>
            Pembayaran
          </div>
          {sale.payments.length === 0 ? (
            <div className="muted">-</div>
          ) : (
            sale.payments.map((p) => (
              <div key={p.id} style={{ display: "grid", gap: 4 }}>
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
