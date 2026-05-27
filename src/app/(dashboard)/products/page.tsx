import Link from "next/link";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { getProductOverview, listProductMeta, listProducts } from "@/modules/products/service";
import { ProductsTable } from "@/modules/products/components/products-table";
import { ProductsMobileList } from "@/modules/products/components/products-mobile-list";
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
  const can = (perm: string) => ctx.isSuperAdmin || ctx.permissions.includes(perm);
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
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/products/categories">Kategori</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/products/units">Satuan</Link>
            </Button>
            {can(PERMISSIONS.products_import) ? (
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/products/import">Import</Link>
              </Button>
            ) : null}
            {can(PERMISSIONS.products_export) ? (
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/products/export">Export</Link>
              </Button>
            ) : null}
            {can(PERMISSIONS.products_barcode_read) ? (
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/products/barcodes">Barcode</Link>
              </Button>
            ) : null}
            {can(PERMISSIONS.products_expired_read) ? (
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/products/expired">Expired</Link>
              </Button>
            ) : null}
            {can(PERMISSIONS.products_expired_read) ? (
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/products/batches">Stock Batch</Link>
              </Button>
            ) : null}
            <Button asChild className="gap-2 rounded-xl">
              <Link href="/products/create">
                <Plus className="h-4 w-4" />
                Tambah Produk
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Produk", value: overview.total, badge: null },
          { label: "Active", value: overview.active, badge: <Badge variant="secondary">Aktif</Badge> },
          { label: "Inactive", value: overview.inactive, badge: <Badge variant="secondary">Nonaktif</Badge> },
          { label: "Dengan Barcode", value: overview.withBarcode, badge: null },
        ].map((k) => (
          <Card key={k.label} className="rounded-3xl">
            <CardContent className="grid gap-2 py-5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm text-muted-foreground">{k.label}</div>
                {k.badge}
              </div>
              <div className="text-3xl font-semibold tracking-tight">{k.value.toLocaleString("id-ID")}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="md:hidden">
        <Card className="rounded-3xl">
          <CardContent className="grid gap-3 p-4">
            <form className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  name="q"
                  defaultValue={result.q ?? ""}
                  placeholder="Search inventory..."
                  className="h-12 w-full rounded-2xl border bg-background pl-10 pr-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <Button type="submit" variant="outline" className="h-12 w-12 rounded-2xl p-0" aria-label="Filter">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-4">
          <div className="mb-3 text-sm font-semibold">Active Inventory</div>
          <ProductsMobileList
            items={result.items.map((p) => ({
              id: p.id,
              sku: p.sku,
              name: p.name,
              categoryName: p.category?.name ?? "-",
              sellingPrice: Number(p.sellingPrice),
              isActive: p.isActive,
            }))}
          />
        </div>

        <div className="mt-4 grid gap-2 rounded-2xl border bg-background p-3 text-xs text-muted-foreground">
          <div>
            Menampilkan {result.items.length} dari {result.total} produk • Page {result.page}/{totalPages}
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="flex-1 rounded-xl" disabled={result.page <= 1}>
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
            <Button asChild variant="outline" size="sm" className="flex-1 rounded-xl" disabled={result.page >= totalPages}>
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
        </div>

        <Link
          href="/products/create"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-5 z-40 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg md:hidden"
          aria-label="Tambah Produk"
        >
          <Plus className="h-6 w-6" />
        </Link>
      </div>

      <div className="hidden md:block">
        <ProductsTable
          items={result.items.map((p) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            barcode: p.barcode,
            categoryName: p.category?.name ?? "-",
            sellingPrice: Number(p.sellingPrice),
            isActive: p.isActive,
            updatedAt: p.updatedAt.toISOString(),
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
    </div>
  );
}
