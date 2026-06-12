import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ProductMobileRow = {
  id: string;
  name: string;
  sku: string;
  categoryName: string;
  sellingPrice: unknown;
  stock: number;
  isActive: boolean;
};

function rupiah(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
}

export function ProductsMobileList({ items }: { items: ProductMobileRow[] }) {
  if (items.length === 0) {
    return <div className="rounded-2xl border bg-background p-4 text-sm text-muted-foreground">Tidak ada data.</div>;
  }

  return (
    <div className="grid gap-3">
      {items.map((p) => (
        <Link
          key={p.id}
          href={`/products/${p.id}/edit`}
          className="group flex items-center gap-4 rounded-3xl border bg-background p-4 shadow-sm transition hover:bg-muted/10"
        >
          <div className="grid h-14 w-14 place-items-center rounded-2xl border bg-muted/20 text-sm font-semibold text-muted-foreground">
            {p.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{p.name}</div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  SKU: <span className="font-mono">{p.sku}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-primary">{rupiah(p.sellingPrice)}</div>
                <div className="mt-1 text-xs tabular-nums text-muted-foreground">Stok: {Number.isFinite(p.stock) ? p.stock.toLocaleString("id-ID") : "-"}</div>
                <div className="mt-0.5 inline-flex items-center gap-2 text-xs">
                  <span className={`h-2 w-2 rounded-full ${p.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                  <span className={p.isActive ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}>
                    {p.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <div className="truncate">{p.categoryName}</div>
              <Button type="button" variant="ghost" size="sm" className="h-9 w-9 rounded-2xl p-0 opacity-70 group-hover:opacity-100">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

