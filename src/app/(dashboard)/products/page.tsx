import Link from "next/link";
import { Boxes, CheckCircle2, ChevronDown, Plus, ScanBarcode, Search, XCircle } from "lucide-react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-1.5 rounded-xl">
                  Alat
                  <ChevronDown className="h-4 w-4 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Master</DropdownMenuLabel>
                <DropdownMenuItem asChild><Link href="/products/categories" className="w-full">Kategori</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/products/units" className="w-full">Satuan</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Data</DropdownMenuLabel>
                {can(PERMISSIONS.products_import) ? <DropdownMenuItem asChild><Link href="/products/import" className="w-full">Import</Link></DropdownMenuItem> : null}
                {can(PERMISSIONS.products_export) ? <DropdownMenuItem asChild><Link href="/products/export" className="w-full">Export</Link></DropdownMenuItem> : null}
                {can(PERMISSIONS.products_barcode_read) ? <DropdownMenuItem asChild><Link href="/products/barcodes" className="w-full">Barcode</Link></DropdownMenuItem> : null}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Operasional</DropdownMenuLabel>
                {can(PERMISSIONS.products_analytics_read) ? <DropdownMenuItem asChild><Link href="/products/analytics" className="w-full">Analytics</Link></DropdownMenuItem> : null}
                {can(PERMISSIONS.products_price_manage) ? <DropdownMenuItem asChild><Link href="/products/prices" className="w-full">Harga</Link></DropdownMenuItem> : null}
                {can(PERMISSIONS.products_discount_manage) ? <DropdownMenuItem asChild><Link href="/products/discounts" className="w-full">Promo</Link></DropdownMenuItem> : null}
                {can(PERMISSIONS.products_expired_read) ? <DropdownMenuItem asChild><Link href="/products/expired" className="w-full">Expired</Link></DropdownMenuItem> : null}
                {can(PERMISSIONS.products_expired_read) ? <DropdownMenuItem asChild><Link href="/products/batches" className="w-full">Stock Batch</Link></DropdownMenuItem> : null}
              </DropdownMenuContent>
            </DropdownMenu>
            {can(PERMISSIONS.products_write) ? (
              <Button asChild className="gap-2 rounded-xl">
                <Link href="/products/create">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Tambah Produk</span>
                  <span className="sm:hidden">Tambah</span>
                </Link>
              </Button>
            ) : null}
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

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 xl:grid-cols-4 sm:gap-3">
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
        <form className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                name="q"
                defaultValue={result.q ?? ""}
                placeholder="Cari produk..."
                className="h-11 w-full rounded-2xl border bg-background pl-10 pr-4 text-sm outline-none ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Button type="submit" variant="outline" className="h-11 w-11 shrink-0 rounded-2xl p-0" aria-label="Cari">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <select
              name="categoryId"
              defaultValue={result.categoryId ?? ""}
              className="h-10 flex-1 rounded-xl border bg-background px-3 text-sm outline-none ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Semua Kategori</option>
              {meta.categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={result.status ?? ""}
              className="h-10 flex-1 rounded-xl border bg-background px-3 text-sm outline-none ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>
        </form>

        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold">Produk</span>
            <span className="text-xs text-muted-foreground">{result.total} item</span>
          </div>
          <ProductsMobileList
            items={result.items.map((p) => ({
              id: p.id,
              sku: p.sku,
              name: p.name,
              categoryName: p.category?.name ?? "-",
              sellingPrice: Number(p.sellingPrice),
              stock: p.stock,
              isActive: p.isActive,
              imageUrl: (p as unknown as { imageUrl?: string | null }).imageUrl ?? null,
            }))}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border bg-background px-4 py-3 text-xs text-muted-foreground">
          <span>Hal {result.page}/{totalPages}</span>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="h-9 rounded-xl px-4" disabled={result.page <= 1}>
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
            <Button asChild variant="outline" size="sm" className="h-9 rounded-xl px-4" disabled={result.page >= totalPages}>
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
          className="fixed bottom-[88px] right-5 z-40 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-90"
          aria-label="Tambah Produk"
        >
          <Plus className="h-5 w-5" />
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
            stock: p.stock,
            isActive: p.isActive,
            updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : p.updatedAt.toISOString(),
            imageUrl: (p as unknown as { imageUrl?: string | null }).imageUrl ?? null,
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
