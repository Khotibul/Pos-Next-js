"use client";

import { CheckCircle2, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export function TransactionSuccessDialog({
  open,
  onOpenChange,
  invoiceNo,
  total,
  itemCount,
  onPrint,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoiceNo: string;
  total: number;
  itemCount: number;
  onPrint: () => void;
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

        <div className="rounded-2xl border bg-muted/20 p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice</span>
              <span className="font-medium">{invoiceNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Item</span>
              <span className="font-medium">{itemCount} produk</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between text-base">
                <span className="font-semibold">Total</span>
                <span className="text-lg font-bold text-primary">{rupiah(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Tutup
          </Button>
          <Button className="rounded-xl" onClick={onPrint}>
            <Printer className="mr-2 h-4 w-4" />
            Cetak Struk
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
