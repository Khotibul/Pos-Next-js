"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { rupiah } from "./cart/cart-common";
import type { Product, ProductVariant } from "./cart/cart-common";

export function VariantPickerDialog({
  product,
  open,
  onOpenChange,
  onSelect,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (product: Product, variant: ProductVariant) => void;
}) {
  const variants = product?.variants ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pilih Varian</DialogTitle>
          <DialogDescription>{product?.name}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {variants.length === 0 ? (
            <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
              Belum ada varian aktif.
            </div>
          ) : (
            variants.map((variant) => {
              const outOfStock = Number(variant.stock ?? 0) <= 0;
              return (
                <button
                  key={variant.id}
                  type="button"
                  disabled={outOfStock}
                  onClick={() => {
                    if (!product) return;
                    onSelect(product, variant);
                    onOpenChange(false);
                  }}
                  className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{variant.name}</div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground">{variant.sku}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Stok: <span className="font-semibold">{Number(variant.stock ?? 0).toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold text-primary">{rupiah(variant.price)}</div>
                    <div className="text-[11px] text-muted-foreground">{outOfStock ? "Habis" : "Tersedia"}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
