import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type SaleMobileRow = {
  id: string;
  invoiceNo: string;
  status: string;
  total: unknown;
  createdAt: string;
};

function rupiah(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
}

function statusLabel(status: string) {
  if (status === "PAID") return { text: "Success", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" };
  if (status === "VOID") return { text: "Failed", cls: "bg-red-500/15 text-red-700 dark:text-red-300" };
  return { text: "Pending", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" };
}

export function SalesMobileList({ items }: { items: SaleMobileRow[] }) {
  if (items.length === 0) {
    return <div className="rounded-2xl border bg-background p-4 text-sm text-muted-foreground">Belum ada transaksi.</div>;
  }

  return (
    <div className="grid gap-3">
      {items.map((s) => {
        const badge = statusLabel(s.status);
        return (
          <Link
            key={s.id}
            href={`/pos/history/${s.id}`}
            className="flex items-center justify-between gap-4 rounded-3xl border bg-background p-4 shadow-sm transition hover:bg-muted/10"
          >
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">
                ID: <span className="font-mono text-primary">{s.invoiceNo}</span>
              </div>
              <div className="mt-1 truncate text-base font-semibold">Transaksi</div>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
                <span className={cn("rounded-full px-2 py-1", badge.cls)}>{badge.text}</span>
                <span className="text-muted-foreground">{new Date(s.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-lg font-semibold text-primary">{rupiah(s.total)}</div>
                <div className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleDateString("id-ID")}</div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

