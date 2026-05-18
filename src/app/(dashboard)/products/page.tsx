import Link from "next/link";
import { Plus } from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { getProductOverview, listProductMeta, listProducts } from "@/modules/products/service";
import { ProductsTable } from "@/modules/products/components/products-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; categoryId?: string; status?: string }>;
}) {
  const ctx = await requirePermission(PERMISSIONS.products_read);
  const sp = await searchParams;
  const q = sp.q ?? null;
  const categoryId = sp.categoryId ?? null;
  const status = sp.status === "active" || sp.status === "inactive" ? sp.status : null;
  const page = sp.page ? Number(sp.page) : 1;

  const [overview, meta, result] = await Promise.all([
    getProductOverview({ tenantId: ctx.tenantId }),
    listProductMeta({ tenantId: ctx.tenantId }),
    listProducts({
      tenantId: ctx.tenantId,
      q,
      categoryId,
      status,
      page: Number.isFinite(page) ? page : 1,
      pageSize: 10,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const prevPage = Math.max(1, result.page - 1);
  const nextPage = Math.min(totalPages, result.page + 1);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Manajemen Inventaris"
        description="Pantau stok dan kelola produk Anda secara real-time."
        actions={
          <Button asChild className="gap-2">
            <Link href="/products/new">
              <Plus className="h-4 w-4" />
              Tambah Produk
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Produk", value: overview.total, badge: null },
          { label: "Active", value: overview.active, badge: <Badge variant="secondary">Aktif</Badge> },
          { label: "Inactive", value: overview.inactive, badge: <Badge variant="secondary">Nonaktif</Badge> },
          { label: "Dengan Barcode", value: overview.withBarcode, badge: null },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="grid gap-2 py-5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">{k.label}</div>
                {k.badge}
              </div>
              <div className="text-3xl font-semibold tracking-tight">{k.value.toLocaleString("id-ID")}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ProductsTable
        items={result.items.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          barcode: p.barcode,
          categoryName: p.category?.name ?? "-",
          sellingPrice: p.sellingPrice,
          isActive: p.isActive,
          updatedAt: p.updatedAt,
        }))}
        query={{
          q: result.q ?? "",
          categoryId: result.categoryId ?? "",
          status: result.status ?? "",
          page: result.page,
        }}
        categories={meta.categories}
      />

      <Card>
        <CardContent className="flex items-center justify-between py-4 text-sm text-muted-foreground">
          <div>{`Total: ${result.total} • Page ${result.page}/${totalPages}`}</div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" disabled={result.page <= 1}>
              <Link
                href={`/products?${new URLSearchParams({
                  ...(q ? { q } : {}),
                  ...(categoryId ? { categoryId } : {}),
                  ...(status ? { status } : {}),
                  page: String(prevPage),
                }).toString()}`}
              >
                Prev
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" disabled={result.page >= totalPages}>
              <Link
                href={`/products?${new URLSearchParams({
                  ...(q ? { q } : {}),
                  ...(categoryId ? { categoryId } : {}),
                  ...(status ? { status } : {}),
                  page: String(nextPage),
                }).toString()}`}
              >
                Next
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
