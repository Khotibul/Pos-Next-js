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
      className="group relative flex flex-col rounded-2xl border bg-card text-left shadow-xs transition-all hover:-translate-y-1 hover:shadow-lg active:scale-[0.98] p-2 sm:p-4 2xl:p-5"
      onClick={() => onInc(product.id)}
      type="button"
    >
      <div className="mb-2 flex items-center gap-2 sm:mb-4 sm:gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-12 sm:w-12 sm:rounded-2xl">
          <span className="text-xs font-bold sm:text-base">{product.name.charAt(0).toUpperCase()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-xs font-semibold leading-tight sm:truncate sm:text-base">{product.name}</div>
          <div className="mt-0.5 hidden truncate text-xs text-muted-foreground sm:block">{product.sku}</div>
        </div>
      </div>

      <div className="mb-1 flex items-baseline justify-between gap-1 sm:mb-3 sm:gap-2">
        <span className="text-sm font-bold text-primary sm:text-lg 2xl:text-xl">{rupiah(product.price)}</span>
        {product.wholesaleMinQty && product.wholesaleMinQty > 0 ? (
          <span className="shrink-0 rounded-md bg-orange-100 px-1.5 py-0.5 text-[9px] font-semibold text-orange-700 sm:px-2 sm:text-xs">Grosir</span>
        ) : null}
      </div>

      {showStock ? (
        <div className="mb-1 text-[10px] text-muted-foreground sm:mb-4 sm:text-xs">
          Stok: <span className="font-semibold">{Number(product.stock ?? 0).toLocaleString("id-ID")}</span>
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-end border-t border-dashed pt-2 text-[10px] sm:pt-4 sm:text-sm">
        <span className="inline-flex items-center gap-1 rounded-lg bg-primary/5 px-3 py-1.5 font-semibold text-primary transition-all group-hover:bg-primary/10 group-hover:text-primary/90 sm:rounded-xl sm:px-5 sm:py-2.5 sm:gap-1.5">
          <svg className="h-3 w-3 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className="sm:inline">Tambah</span>
        </span>
      </div>
    </button>
  );
});
