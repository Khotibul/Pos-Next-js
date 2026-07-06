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
      className="group relative flex flex-col rounded-2xl border bg-card p-3 text-left shadow-xs transition-all hover:-translate-y-1 hover:shadow-lg active:scale-[0.98] sm:p-4 2xl:p-5"
      onClick={() => onInc(product.id)}
      type="button"
    >
      <div className="mb-3 flex items-center gap-3 sm:mb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-12 sm:w-12 sm:rounded-2xl">
          <span className="text-sm font-bold sm:text-base">{product.name.charAt(0).toUpperCase()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold leading-tight sm:text-base">{product.name}</div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">{product.sku}</div>
        </div>
      </div>

      <div className="mb-2 flex items-baseline justify-between gap-2 sm:mb-3">
        <span className="text-base font-bold text-primary sm:text-lg 2xl:text-xl">{rupiah(product.price)}</span>
        {product.wholesaleMinQty && product.wholesaleMinQty > 0 ? (
          <span className="shrink-0 rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 sm:text-xs">Grosir</span>
        ) : null}
      </div>

      {showStock ? (
        <div className="mb-3 text-xs text-muted-foreground sm:mb-4">
          Stok: <span className="font-semibold">{Number(product.stock ?? 0).toLocaleString("id-ID")}</span>
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-end border-t border-dashed pt-3 text-xs sm:pt-4 sm:text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary/5 px-4 py-2 font-semibold text-primary transition-all group-hover:bg-primary/10 group-hover:text-primary/90 group-hover:shadow-xs sm:px-5 sm:py-2.5">
          <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Tambah
        </span>
      </div>
    </button>
  );
});
