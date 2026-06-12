import Link from "next/link";
import { Banknote, Boxes, Percent, Tag } from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/layout/stat-card";
import { getProductEnterpriseDetail } from "@/modules/products/enterprise/service";
import { ProductVariantsTable } from "@/modules/products/components/product-variants-table";

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export default async function ProductDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const ctx = await requirePermission(PERMISSIONS.products_read);
  const { productId } = await params;

  const { product, variants, totalStock } = await getProductEnterpriseDetail({ tenantId: ctx.tenantId, id: productId });

  const cost = Number(product.costPrice);
  const sell = Number(product.sellingPrice);
  const marginPct = Number(product.marginPct);

  return (
    <div className="grid gap-4">
      <PageHeader
        title={product.name}
        description={`SKU: ${product.sku} • Updated: ${new Date(product.updatedAt).toLocaleString("id-ID")}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/products">Kembali</Link>
            </Button>
            <Button asChild className="rounded-xl">
              <Link href={`/products/${product.id}/edit`}>Edit</Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Tag className="h-5 w-5" />} title="Harga Jual" value={rupiah(sell)} description="Harga utama produk" />
        <StatCard icon={<Banknote className="h-5 w-5" />} title="Harga Modal" value={rupiah(cost)} tone="slate" description="Cost terakhir" />
        <StatCard icon={<Percent className="h-5 w-5" />} title="Margin" value={`${Number.isFinite(marginPct) ? marginPct.toFixed(1) : "0"}%`} tone="success" description="Estimasi laba kotor" />
        <StatCard
          icon={<Boxes className="h-5 w-5" />}
          title="Total Stok"
          value={totalStock.toLocaleString("id-ID")}
          tone={totalStock <= 0 ? "danger" : "primary"}
          description={totalStock <= 0 ? <Badge variant="secondary">Out of stock</Badge> : "Akumulasi stok"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-3xl lg:col-span-2">
          <CardContent className="grid gap-3 py-5">
            <div className="text-sm font-semibold">Informasi Produk</div>
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-wide">Kategori</div>
                <div className="text-foreground">{product.category?.name ?? "-"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide">Brand</div>
                <div className="text-foreground">{product.brand?.name ?? "-"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide">Supplier</div>
                <div className="text-foreground">{product.supplier?.name ?? "-"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide">Unit</div>
                <div className="text-foreground">{product.unit?.name ?? "-"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide">Barcode</div>
                <div className="text-foreground">{product.barcode ?? "-"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide">QR Code</div>
                <div className="text-foreground">{product.qrCode ?? "-"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide">Tipe</div>
                <div className="text-foreground">{product.type}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide">Status</div>
                <div className="text-foreground">{product.isActive ? "Active" : "Inactive"}</div>
              </div>
            </div>

            {product.description ? (
              <div className="rounded-2xl border bg-muted/10 p-4 text-sm">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deskripsi</div>
                <div className="whitespace-pre-wrap">{product.description}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardContent className="grid gap-3 py-5">
            <div className="text-sm font-semibold">Policy Stok</div>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Minimum</span>
                <span className="text-foreground">{Number(product.minStock).toLocaleString("id-ID")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Reorder Point</span>
                <span className="text-foreground">{Number(product.reorderPoint).toLocaleString("id-ID")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Pajak</span>
                <span className="text-foreground">{Number(product.taxRate).toLocaleString("id-ID")}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Featured</span>
                <span className="text-foreground">{product.isFeatured ? "Ya" : "Tidak"}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-orange-600">Harga Grosir</div>
                <div className="flex items-center justify-between">
                  <span>Harga Grosir</span>
                  <span className="text-foreground">{Number(product.wholesalePrice) > 0 ? rupiah(Number(product.wholesalePrice)) : "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Diskon Grosir</span>
                  <span className="text-foreground">{Number(product.wholesaleDiscountPercent) > 0 ? `${Number(product.wholesaleDiscountPercent)}%` : "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Min. Pembelian</span>
                  <span className="text-foreground">{Number(product.wholesaleMinQty) > 0 ? Number(product.wholesaleMinQty).toLocaleString("id-ID") : "-"}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Konsinyasi</span>
                <span className="text-foreground">{product.isConsignment ? "Ya" : "Tidak"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ProductVariantsTable
        productId={product.id}
        variants={variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          name: v.name,
          barcode: v.barcode,
          qrCode: v.qrCode,
          attributes: v.attributes && typeof v.attributes === "object" && !Array.isArray(v.attributes) ? (v.attributes as Record<string, unknown>) : null,
          costPrice: Number(v.costPrice),
          sellingPrice: Number(v.sellingPrice),
          isActive: v.isActive,
          updatedAt: new Date(v.updatedAt).toISOString(),
        }))}
      />
    </div>
  );
}
