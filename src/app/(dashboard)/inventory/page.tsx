import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, ClipboardCheck, Warehouse, Plus, PackageSearch, AlertTriangle } from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function InventoryPage() {
  const ctx = await requirePermission(PERMISSIONS.inventory_read);

  const [warehouseCount, lowStockProducts, expiredBatchCount] = await Promise.all([
    prisma.warehouse.count({ where: { tenantId: ctx.tenantId, isActive: true } }),
    prisma.product.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      select: {
        id: true,
        minStock: true,
        warehouseStocks: { select: { qty: true } },
      },
    }),
    prisma.productBatch.count({
      where: {
        tenantId: ctx.tenantId,
        expiredAt: { lte: new Date() },
      },
    }),
  ]);

  const lowStockCount = lowStockProducts.filter((p) => {
    const totalStock = p.warehouseStocks.reduce((sum, s) => sum + Number(s.qty), 0);
    return totalStock <= Number(p.minStock);
  }).length;

  return (
    <div className="grid gap-4">
      <PageHeader title="Manajemen Inventory" description="Kelola stok, gudang, dan mutasi barang." />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl card-lift">
          <CardHeader className="py-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Warehouse className="h-4 w-4" />
              </span>
              Gudang Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{warehouseCount}</div>
            <div className="mt-1 text-sm text-muted-foreground">Total gudang/cabang</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl card-lift">
          <CardHeader className="py-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
              </span>
              Stok Menipis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{lowStockCount}</div>
            <div className="mt-1 text-sm text-muted-foreground">Produk dengan stok di bawah minimum</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl card-lift">
          <CardHeader className="py-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-rose-500/10 text-rose-700 dark:text-rose-300">
                <PackageSearch className="h-4 w-4" />
              </span>
              Kadaluarsa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-600">{expiredBatchCount}</div>
            <div className="mt-1 text-sm text-muted-foreground">Batch produk sudah expired</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-2xl card-lift">
          <CardHeader className="py-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary">
                <ArrowRightLeft className="h-4 w-4" />
              </span>
              Mutasi Stok
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm text-muted-foreground">Pindahkan stok antar gudang/cabang dengan audit trail lengkap.</p>
            <Button asChild className="rounded-xl">
              <Link href="/products/transfers">
                <ArrowRightLeft className="h-4 w-4" />
                Transfer Stok
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl card-lift">
          <CardHeader className="py-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary">
                <ClipboardCheck className="h-4 w-4" />
              </span>
              Stock Opname
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm text-muted-foreground">Lakukan opname stok fisik dan sesuaikan selisih.</p>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/products/batches">
                <PackageSearch className="h-4 w-4" />
                Lihat Batch
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl card-lift">
          <CardHeader className="py-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Plus className="h-4 w-4" />
              </span>
              Atur Stok
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm text-muted-foreground">Sesuaikan stok produk secara manual.</p>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/products">
                <PackageSearch className="h-4 w-4" />
                Kelola Produk
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
