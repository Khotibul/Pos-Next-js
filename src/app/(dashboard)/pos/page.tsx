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
import { getOpenShift } from "@/modules/shifts/service";
import { createDevTimer } from "@/lib/perf";

export default async function PosPage() {
  const endTotal = createDevTimer("posPage.total");
  const endAuth = createDevTimer("posPage.auth");
  const ctx = await requirePermission(PERMISSIONS.sales_write);
  await requireCanTransact({ tenantId: ctx.tenantId, userId: ctx.userId, status: ctx.tenantStatus, trialEndsAt: ctx.tenantTrialEndsAt?.toISOString() ?? null });
  endAuth();

  const endData = createDevTimer("posPage.data");
  const [products, printerSettings, branchWarehouses, openShift, customers] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      orderBy: { updatedAt: "desc" },
      take: 60,
      select: { id: true, name: true, sku: true, barcode: true, qrCode: true, sellingPrice: true, wholesalePrice: true, wholesaleDiscountPercent: true, wholesaleMinQty: true },
    }),
    getPrinterSettings({ tenantId: ctx.tenantId }),
    prisma.warehouse.findMany({
      where: { tenantId: ctx.tenantId, isActive: true, OR: [{ branchId: ctx.branchId }, { branchId: null }] },
      select: { id: true },
    }),
    getOpenShift({ tenantId: ctx.tenantId, branchId: ctx.branchId, cashierId: ctx.userId }),
    prisma.customer.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true },
    }),
  ]);

  const warehouseIds = branchWarehouses.map((w) => w.id);
  const [stockRows, imageRows, variantRows] = await Promise.all([
    products.length > 0 && warehouseIds.length > 0
      ? prisma.productWarehouseStock.groupBy({
          by: ["productId", "variantId"],
          where: {
            tenantId: ctx.tenantId,
            productId: { in: products.map((p) => p.id) },
            warehouseId: { in: warehouseIds },
          },
          _sum: { qty: true },
        })
      : Promise.resolve([] as Array<{ productId: string; variantId: string | null; _sum: { qty: number | null } }>),
    products.length > 0
      ? prisma.productImage.findMany({
          where: { tenantId: ctx.tenantId, productId: { in: products.map((p) => p.id) } },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: { productId: true, url: true },
        })
      : Promise.resolve([] as Array<{ productId: string; url: string }>),
    products.length > 0
      ? prisma.productVariant.findMany({
          where: { tenantId: ctx.tenantId, productId: { in: products.map((p) => p.id) }, isActive: true },
          orderBy: [{ name: "asc" }],
          select: { id: true, productId: true, name: true, sku: true, barcode: true, qrCode: true, sellingPrice: true },
        })
      : Promise.resolve([] as Array<{ id: string; productId: string; name: string; sku: string; barcode: string | null; qrCode: string | null; sellingPrice: unknown }>),
  ]);

  const stockByProductId = new Map<string, number>();
  const stockByVariantId = new Map<string, number>();
  for (const row of stockRows) {
    const qty = Number(row._sum.qty ?? 0);
    stockByProductId.set(row.productId, (stockByProductId.get(row.productId) ?? 0) + qty);
    if (row.variantId) stockByVariantId.set(row.variantId, qty);
  }
  const variantsByProductId = new Map<string, Array<{ id: string; name: string; sku: string; barcode: string | null; qrCode: string | null; price: number; stock: number }>>();
  for (const v of variantRows) {
    const arr = variantsByProductId.get(v.productId) ?? [];
    arr.push({
      id: v.id,
      name: v.name,
      sku: v.sku,
      barcode: v.barcode,
      qrCode: v.qrCode,
      price: Number(v.sellingPrice),
      stock: stockByVariantId.get(v.id) ?? 0,
    });
    variantsByProductId.set(v.productId, arr);
  }
  const imageByProductId = new Map<string, string>();
  for (const r of imageRows) if (!imageByProductId.has(r.productId)) imageByProductId.set(r.productId, r.url);
  endData();
  endTotal();

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
          initialOpenShiftId={openShift?.id ?? null}
          customers={customers}
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            barcode: p.barcode,
            qrCode: p.qrCode,
            price: Number(p.sellingPrice),
            stock: stockByProductId.get(p.id) ?? 0,
            wholesalePrice: Number(p.wholesalePrice ?? 0),
            wholesaleDiscountPercent: Number(p.wholesaleDiscountPercent ?? 0),
            wholesaleMinQty: Number(p.wholesaleMinQty ?? 0),
            imageUrl: imageByProductId.get(p.id) ?? null,
            variants: variantsByProductId.get(p.id) ?? [],
          }))}
          canEditPrice={ctx.isSuperAdmin || ["OWNER", "ADMIN", "SUPER_ADMIN"].includes((ctx.roleName ?? "").toUpperCase())}
        />
      )}
    </div>
  );
}
