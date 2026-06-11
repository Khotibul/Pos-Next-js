import Link from "next/link";
import { Boxes, CheckCircle2, Plus, ScanBarcode, Search, SlidersHorizontal, XCircle } from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { getProductOverview, listProductMeta, listProducts } from "@/modules/products/service";
import { ProductsTable } from "@/modules/products/components/products-table";
import { ProductsMobileList } from "@/modules/products/components/products-mobile-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/layout/stat-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type ProductOverviewResult = Awaited<ReturnType<typeof getProductOverview>>;
type ProductMetaResult = Awaited<ReturnType<typeof listProductMeta>>;
type ProductListResult = Awaited<ReturnType<typeof listProducts>>;
type LoadState<T> = { data: T; error: string | null };

async function safeLoad<T>(loader: () => Promise<T>, fallback: T): Promise<LoadState<T>> {
  try {
    return { data: await loader(), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat data.";
    console.error("[products] load failed", message);
    return { data: fallback, error: message };
  }
}

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

  const safePage = Number.isFinite(page) ? page : 1;
  const fallbackOverview: ProductOverviewResult = { total: 0, active: 0, inactive: 0, withBarcode: 0 };
  const fallbackMeta: ProductMetaResult = { categories: [], brands: [], units: [], suppliers: [] };
  const fallbackResult: ProductListResult = {
    items: [],
    total: 0,
    page: safePage,
    pageSize: 10,
    q,
    categoryId,
    status,
  };

  const [overviewState, metaState, resultState] = await Promise.all([
    safeLoad(() => getProductOverview({ tenantId: ctx.tenantId }), fallbackOverview),
    safeLoad(() => listProductMeta({ tenantId: ctx.tenantId }), fallbackMeta),
    safeLoad(
      () =>
        listProducts({
          tenantId: ctx.tenantId,
          q,
          categoryId,
          status,
          page: safePage,
          pageSize: 10,
        }),
      fallbackResult
    ),
  ]);
  const overview = overviewState.data;
  const meta = metaState.data;
  const result = resultState.data;
  const loadErrors = [overviewState.error, metaState.error, resultState.error].filter((message): message is string => Boolean(message));

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
            {can(PERMISSIONS.products_analytics_read) ? (
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/products/analytics">Analytics</Link>
              </Button>
            ) : null}
            {can(PERMISSIONS.products_price_manage) ? (
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/products/prices">Harga</Link>
              </Button>
            ) : null}
            {can(PERMISSIONS.products_discount_manage) ? (
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/products/discounts">Promo</Link>
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

      {loadErrors.length > 0 ? (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertTitle>Data produk belum bisa dimuat penuh.</AlertTitle>
          <AlertDescription>
            Halaman tetap dibuka dengan data kosong sementara. Pastikan database sudah dimigrasi/db push dan coba refresh halaman.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Boxes className="h-5 w-5" />} title="Total Produk" value={overview.total.toLocaleString("id-ID")} description="Semua item master produk" />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="Active"
          value={overview.active.toLocaleString("id-ID")}
          tone="success"
          description={<Badge variant="secondary">Aktif dijual</Badge>}
        />
        <StatCard icon={<XCircle className="h-5 w-5" />} title="Inactive" value={overview.inactive.toLocaleString("id-ID")} tone="slate" description="Produk dinonaktifkan" />
        <StatCard icon={<ScanBarcode className="h-5 w-5" />} title="Dengan Barcode" value={overview.withBarcode.toLocaleString("id-ID")} description="Siap scan kasir" />
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
            updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : p.updatedAt.toISOString(),
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
