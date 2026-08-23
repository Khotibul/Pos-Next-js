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
      className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-xs transition-all hover:-translate-y-1 hover:shadow-lg active:scale-[0.98]"
      onClick={() => onInc(product.id)}
      type="button"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-muted/30">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 text-primary">
            <span className="text-2xl font-bold sm:text-3xl">{product.name.charAt(0).toUpperCase()}</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-2 sm:p-3 2xl:p-4">
        <div className="min-w-0">
          <div className="line-clamp-2 text-xs font-semibold leading-tight sm:text-sm">{product.name}</div>
          <div className="mt-0.5 truncate text-[10px] text-muted-foreground sm:text-xs">{product.sku}</div>
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-1">
          <span className="text-sm font-bold text-primary sm:text-base 2xl:text-lg">{rupiah(product.price)}</span>
          {product.wholesaleMinQty && product.wholesaleMinQty > 0 ? (
            <span className="shrink-0 rounded-md bg-orange-100 px-1.5 py-0.5 text-[9px] font-semibold text-orange-700 sm:px-2 sm:text-xs">Grosir</span>
          ) : null}
        </div>
        {showStock ? (
          <div className="mt-1 text-[10px] text-muted-foreground sm:text-xs">
            Stok: <span className="font-semibold">{Number(product.stock ?? 0).toLocaleString("id-ID")}</span>
          </div>
        ) : null}
        <div className="mt-auto flex items-center justify-end border-t border-dashed pt-2 text-[10px] sm:pt-3 sm:text-sm">
          <span className="inline-flex items-center gap-1 rounded-lg bg-primary/5 px-3 py-1.5 font-semibold text-primary transition-all group-hover:bg-primary/10 sm:rounded-xl sm:px-4 sm:py-2 sm:gap-1.5">
            <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Tambah</span>
          </span>
        </div>
      </div>
    </button>
  );
});
