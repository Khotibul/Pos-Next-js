import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { getSaleById } from "@/modules/transactions/service";
import { getPrinterSettings } from "@/modules/settings/printer/service";
import { PrintReceiptDialog } from "@/modules/transactions/components/print-receipt-dialog";

function rupiah(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
}

function toNumber(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePermission(PERMISSIONS.sales_read);
  const p = await params;
  const sale = await getSaleById({ tenantId: ctx.tenantId, id: p.id });
  const printer = await getPrinterSettings({ tenantId: ctx.tenantId });

  const saleForPrint = {
    id: sale.id,
    invoiceNo: sale.invoiceNo,
    status: sale.status,
    createdAt: sale.createdAt.toISOString(),
    subtotal: toNumber(sale.subtotal),
    discount: toNumber(sale.discount),
    tax: toNumber(sale.tax),
    total: toNumber(sale.total),
    items: sale.items.map((i) => ({
      id: i.id,
      name: i.name,
      sku: i.sku,
      price: toNumber(i.price),
      qty: i.qty,
      lineTotal: toNumber(i.lineTotal),
    })),
    payments: sale.payments.map((pmt) => ({
      id: pmt.id,
      method: pmt.method,
      amount: toNumber(pmt.amount),
      reference: pmt.reference ?? null,
    })),
  };

  return (
    <div className="grid gap-4">
      <PageHeader
        title={`Transaksi ${sale.invoiceNo}`}
        description={`Status: ${sale.status} • ${new Date(sale.createdAt).toLocaleString("id-ID")}`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="gap-2 rounded-xl">
              <Link href="/pos/history">
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Link>
            </Button>
            <PrintReceiptDialog sale={saleForPrint} printer={printer} />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 rounded-2xl">
          <CardHeader className="py-4">
            <CardTitle className="text-base">Item</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto rounded-2xl border bg-background p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-right">Harga</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <div className="font-medium">{i.name}</div>
                      <div className="text-xs text-muted-foreground">{i.sku}</div>
                    </TableCell>
                    <TableCell className="text-right">{rupiah(i.price)}</TableCell>
                    <TableCell className="text-right">{i.qty}</TableCell>
                    <TableCell className="text-right font-medium">{rupiah(i.lineTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="py-4">
            <CardTitle className="text-base">Ringkasan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{rupiah(sale.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Diskon</span>
              <span>{rupiah(sale.discount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pajak</span>
              <span>{rupiah(sale.tax)}</span>
            </div>
            <div className="mt-2 flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="text-primary">{rupiah(sale.total)}</span>
            </div>

            <div className="mt-4 grid gap-2">
              <div className="text-sm font-medium">Pembayaran</div>
              {sale.payments.length === 0 ? (
                <div className="text-sm text-muted-foreground">-</div>
              ) : (
                sale.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border bg-background p-3">
                    <div className="text-sm font-medium">{p.method}</div>
                    <div className="text-sm font-semibold">{rupiah(p.amount)}</div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4">
              <PrintReceiptDialog sale={saleForPrint} printer={printer} triggerVariant="outline" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
