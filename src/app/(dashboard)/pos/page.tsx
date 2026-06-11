import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { requireCanTransact } from "@/lib/guards/require-can-transact";
import { prisma } from "@/lib/prisma";
import { PosScreen } from "@/modules/transactions/components/pos-screen";
import { getPrinterSettings } from "@/modules/settings/printer/service";

export default async function PosPage() {
  console.time("posPage.total");
  console.time("posPage.auth");
  const ctx = await requirePermission(PERMISSIONS.sales_write);
  await requireCanTransact({ tenantId: ctx.tenantId, userId: ctx.userId });
  console.timeEnd("posPage.auth");

  console.time("posPage.data");
  const [products, printerSettings] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      orderBy: { updatedAt: "desc" },
      take: 60,
      select: { id: true, name: true, sku: true, barcode: true, qrCode: true, sellingPrice: true },
    }),
    getPrinterSettings({ tenantId: ctx.tenantId }),
  ]);
  const stockRows =
    products.length === 0
      ? []
      : await prisma.productWarehouseStock.groupBy({
          by: ["productId"],
          where: { tenantId: ctx.tenantId, productId: { in: products.map((p) => p.id) } },
          _sum: { qty: true },
        });
  const stockByProductId = new Map(stockRows.map((row) => [row.productId, Number(row._sum.qty ?? 0)]));
  console.timeEnd("posPage.data");
  console.timeEnd("posPage.total");

  return (
    <div className="grid gap-4">
      <PageHeader
        title="POS Kasir"
        description="POS kasir cepat: pilih produk, cek keranjang, lalu bayar."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="gap-2 rounded-xl">
              <Link href="/pos/history">Riwayat</Link>
            </Button>
            <Button asChild variant="outline" className="gap-2 rounded-xl">
              <Link href="/products/new">
                <Plus className="h-4 w-4" />
                Tambah Produk
              </Link>
            </Button>
          </div>
        }
      />

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Belum ada produk aktif. Tambahkan produk dulu agar POS bisa digunakan.
          </CardContent>
        </Card>
      ) : (
        <PosScreen
          initialSettings={printerSettings}
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            barcode: p.barcode,
            qrCode: p.qrCode,
            price: Number(p.sellingPrice),
            stock: stockByProductId.get(p.id) ?? 0,
          }))}
        />
      )}
    </div>
  );
}
