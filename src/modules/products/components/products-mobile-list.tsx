import Link from "next/link";

export type ProductMobileRow = {
  id: string;
  name: string;
  sku: string;
  categoryName: string;
  sellingPrice: unknown;
  stock: number;
  isActive: boolean;
  imageUrl?: string | null;
};

function rupiah(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
}

export function ProductsMobileList({ items }: { items: ProductMobileRow[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-background p-10 text-sm text-muted-foreground">
        <svg className="mb-3 h-10 w-10 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <span>Belum ada produk</span>
      </div>
    );
  }

  return (
    <div className="grid gap-2.5">
      {items.map((p) => (
        <Link
          key={p.id}
          href={`/products/${p.id}`}
          className="flex items-center gap-3 rounded-2xl border bg-background p-3.5 shadow-xs transition hover:bg-muted/20 active:scale-[0.99]"
        >
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border bg-muted/20">
            {p.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-bold text-muted-foreground">{p.name.slice(0, 1).toUpperCase()}</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{p.name}</div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  SKU: <span className="font-mono">{p.sku}</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-bold text-primary">{rupiah(p.sellingPrice)}</div>
                <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">Stok: {Number.isFinite(p.stock) ? p.stock.toLocaleString("id-ID") : "-"}</div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="truncate text-muted-foreground">{p.categoryName}</span>
              <span className="text-muted-foreground/30">|</span>
              <span className={`inline-flex items-center gap-1.5 ${p.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${p.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                {p.isActive ? "Aktif" : "Nonaktif"}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
