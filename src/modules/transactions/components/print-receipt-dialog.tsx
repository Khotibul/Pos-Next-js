"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PrinterSettings } from "@/modules/settings/printer/validators";
import { ReceiptView } from "@/modules/transactions/components/receipt-view";
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
        document.body.classList.add("print-receipt");
        window.print();
      });
    } else {
      document.body.classList.add("print-receipt");
      window.print();
    }
  }
}

export function PrintReceiptDialog({
  sale,
  printer,
  triggerLabel = "Cetak Struk",
  triggerVariant = "default",
  defaultOpen = false,
  autoPrintOnOpen = false,
  onOpenChange,
}: {
  sale: ReceiptSale;
  printer: PrinterSettings;
  triggerLabel?: string | null;
  triggerVariant?: "default" | "outline" | "secondary";
  defaultOpen?: boolean;
  autoPrintOnOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const canUseAfterPrint = useMemo(() => typeof window !== "undefined" && "onafterprint" in window, []);

  useEffect(() => {
    const cleanup = () => document.body.classList.remove("print-receipt");
    if (!canUseAfterPrint) return cleanup;
    window.addEventListener("afterprint", cleanup);
    return () => window.removeEventListener("afterprint", cleanup);
  }, [canUseAfterPrint]);

  useEffect(() => {
    if (!open) return;
    if (!autoPrintOnOpen) return;
    const t = window.setTimeout(() => {
      requestPrint(printer, sale);
      if (printer.connectionType !== "bluetooth") {
        window.setTimeout(() => document.body.classList.remove("print-receipt"), 1500);
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [open, autoPrintOnOpen, printer, sale]);

  return (
    <>
      {triggerLabel ? (
        <Button type="button" className="rounded-xl gap-2" variant={triggerVariant} onClick={() => setOpen(true)}>
          <Printer className="h-4 w-4" />
          {triggerLabel}
        </Button>
      ) : null}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          onOpenChange?.(v);
        }}
      >
        <DialogContent className="max-w-3xl rounded-2xl p-0 overflow-hidden">
          <div className="no-print p-6">
            <DialogHeader>
              <DialogTitle>Preview Struk</DialogTitle>
              <DialogDescription>{sale.invoiceNo}</DialogDescription>
            </DialogHeader>
          </div>

          <div className="bg-muted/20 px-6 pb-6">
            <div className="print-receipt-content">
              <ReceiptView sale={sale} printer={printer} autoPrint={false} showPrintButton={false} />
            </div>
          </div>

          <div className="no-print border-t bg-background px-6 py-4">
            <DialogFooter className="mt-0">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
                Tutup
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                onClick={() => {
                  requestPrint(printer, sale);
                  if (printer.connectionType !== "bluetooth") {
                    window.setTimeout(() => {
                      document.body.classList.remove("print-receipt");
                    }, 1500);
                  }
                }}
              >
                Cetak
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
