"use client";

import { memo } from "react";
import type { Product } from "./cart/cart-common";
import { rupiah } from "./cart/cart-common";

export const ProductCard = memo(function ProductCard({
  product,
  onInc,
  showStock,
}: {
  product: Product;
  onInc: (id: string) => void;
  showStock: boolean;
}) {
  return (
    <button
      className="group relative flex flex-col rounded-xl border bg-card p-2.5 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] sm:rounded-2xl sm:p-3.5"
      onClick={() => onInc(product.id)}
      type="button"
    >
      <div className="mb-2 flex items-center gap-2 sm:mb-2.5 sm:gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-10 sm:w-10">
          <span className="text-xs font-bold sm:text-sm">{product.name.charAt(0).toUpperCase()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold leading-tight">{product.name}</div>
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{product.sku}</div>
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-1">
        <span className="text-sm font-bold text-primary sm:text-base">{rupiah(product.price)}</span>
        {product.wholesaleMinQty && product.wholesaleMinQty > 0 ? (
          <span className="shrink-0 rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">Grosir</span>
        ) : null}
      </div>

      {showStock ? (
        <div className="mt-1 text-[11px] text-muted-foreground">
          Stok: <span className="font-medium">{Number(product.stock ?? 0).toLocaleString("id-ID")}</span>
        </div>
      ) : null}

      <div className="mt-2 flex items-center justify-end border-t border-dashed pt-1.5 text-[11px] text-muted-foreground/60 sm:mt-2.5 sm:pt-2">
        <span className="flex items-center gap-1 rounded-lg bg-primary/5 px-2.5 py-1 font-medium text-primary transition-colors group-hover:bg-primary/10">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Tambah
        </span>
      </div>
    </button>
  );
});
