"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ExpiredBatchItem } from "@/modules/products/expired-service";

function statusBadge(daysToExpire: number) {
  if (daysToExpire < 0) return <Badge variant="destructive">Expired</Badge>;
  if (daysToExpire <= 7) return <Badge variant="destructive">7 hari</Badge>;
  if (daysToExpire <= 30) return <Badge variant="secondary">30 hari</Badge>;
  return <Badge variant="secondary">90 hari</Badge>;
}

export function ExpiredProductTable({
  items,
  q,
  window,
}: {
  items: ExpiredBatchItem[];
  q?: string | null;
  window: "expired" | "7" | "30" | "90";
}) {
  const title = useMemo(() => {
    if (window === "expired") return "Expired";
    if (window === "7") return "Expired 7 Hari";
    if (window === "30") return "Expired 30 Hari";
    return "Expired 90 Hari";
  }, [window]);

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="grid gap-0.5">
            <div className="text-sm font-semibold">Produk Hampir Expired</div>
            <div className="text-xs text-muted-foreground">Filter: {title}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["expired", "7", "30", "90"] as const).map((w) => (
              <Button key={w} asChild variant={w === window ? "default" : "outline"} className="rounded-xl">
                <Link
                  href={`/products/expired?${new URLSearchParams({
                    ...(q ? { q } : {}),
                    window: w,
                  }).toString()}`}
                >
                  {w === "expired" ? "Expired" : `${w} hari`}
                </Link>
              </Button>
            ))}
          </div>
        </div>
        <form className="mt-3 flex flex-wrap gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Cari produk / SKU / barcode / batch..."
            className="h-11 w-full max-w-lg rounded-xl border bg-background px-3 text-sm"
          />
          <input type="hidden" name="window" value={window} />
          <Button type="submit" variant="outline" className="rounded-xl">
            Cari
          </Button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-background">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Produk</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Expired</TableHead>
              <TableHead className="text-right">Sisa Hari</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Tidak ada data.
                </TableCell>
              </TableRow>
            ) : (
              items.map((i) => {
                const exp = new Date(i.expiredDate);
                return (
                  <TableRow key={i.id}>
                    <TableCell className="min-w-[260px]">
                      <div className="font-medium">{i.productName}</div>
                      <div className="text-xs text-muted-foreground">{i.sku}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{i.batchNumber ?? "-"}</TableCell>
                    <TableCell>{exp.toLocaleDateString("id-ID")}</TableCell>
                    <TableCell className="text-right">{i.daysToExpire}</TableCell>
                    <TableCell className="text-right">{i.quantity.toLocaleString("id-ID")}</TableCell>
                    <TableCell>{statusBadge(i.daysToExpire)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline" className="rounded-xl">
                        <Link href={`/products/${i.productId}`}>Detail</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

