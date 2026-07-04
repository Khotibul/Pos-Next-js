"use client";

import { memo } from "react";
import { CheckCircle2, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

type LineItem = {
  name: string;
  price: number;
  qty: number;
  lineTotal: number;
};

const LineRow = memo(function LineRow({ item }: { item: LineItem }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{item.name}</div>
        <div className="text-xs text-muted-foreground">{item.qty} x {rupiah(item.price)}</div>
      </div>
      <div className="shrink-0 font-semibold">{rupiah(item.lineTotal)}</div>
    </div>
  );
});

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Tunai",
  QRIS: "QRIS",
  TRANSFER: "Transfer",
  EWALLET: "E-Wallet",
  CARD: "Kartu",
};

export function TransactionSuccessDialog({
  open,
  onOpenChange,
  invoiceNo,
  total,
  subtotal,
  discount,
  tax,
  items,
  paymentMethod,
  receivedAmount,
  changeAmount,
  onPrint,
  printing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoiceNo: string;
  total: number;
  subtotal: number;
  discount?: number;
  tax?: number;
  items: LineItem[];
  paymentMethod: string;
  receivedAmount: number;
  changeAmount: number;
  onPrint: () => void;
  printing?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <DialogTitle className="mt-3 text-center text-xl">Transaksi Berhasil</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Pembayaran telah diterima dan transaksi selesai.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border bg-background">
          <div className="border-b px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Invoice</span>
              <span className="font-semibold">{invoiceNo}</span>
            </div>
          </div>

          <div className="max-h-[240px] divide-y overflow-y-auto px-4 py-2">
            {items.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">Tidak ada item.</div>
            ) : (
              items.map((item, i) => (
                <div key={i} className="py-2">
                  <LineRow item={item} />
                </div>
              ))
            )}
          </div>

          <div className="border-t px-4 py-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{rupiah(subtotal)}</span>
            </div>
            {discount && discount > 0 ? (
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Diskon</span>
                <span className="text-destructive">-{rupiah(discount)}</span>
              </div>
            ) : null}
            {tax && tax > 0 ? (
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Pajak</span>
                <span>{rupiah(tax)}</span>
              </div>
            ) : null}
            <div className="mt-2 flex justify-between">
              <span className="text-muted-foreground">{PAYMENT_LABEL[paymentMethod] ?? paymentMethod}</span>
              <span>{rupiah(receivedAmount)}</span>
            </div>
            {changeAmount > 0 ? (
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Kembalian</span>
                <span className="font-semibold text-primary">{rupiah(changeAmount)}</span>
              </div>
            ) : null}
            <div className="mt-2 flex justify-between border-t pt-2 text-base">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-bold text-primary">{rupiah(total)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Tutup
          </Button>
          <Button className="rounded-xl" onClick={onPrint} disabled={printing}>
            <Printer className="mr-2 h-4 w-4" />
            {printing ? "Mencetak..." : "Cetak Struk"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
