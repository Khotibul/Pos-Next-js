import Link from "next/link";
import { Truck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { SuppliersTable } from "@/modules/suppliers/components/suppliers-table";
import { getSupplierOverview, listSuppliers } from "@/modules/suppliers/service";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const ctx = await requirePermission(PERMISSIONS.suppliers_read);
  const sp = await searchParams;
  const q = sp.q ?? null;
  const page = sp.page ? Number(sp.page) : 1;

  const [overview, result] = await Promise.all([
    getSupplierOverview({ tenantId: ctx.tenantId }),
    listSuppliers({ tenantId: ctx.tenantId, q, page: Number.isFinite(page) ? page : 1, pageSize: 10 }),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const prevPage = Math.max(1, result.page - 1);
  const nextPage = Math.min(totalPages, result.page + 1);

  return (
    <div className="grid gap-4">
      <PageHeader title="Manajemen Supplier" description="Kelola data supplier untuk pembelian, hutang, dan retur." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={<Truck className="h-5 w-5" />} title="Total Supplier" value={overview.total.toLocaleString("id-ID")} />
        <StatCard icon={<Truck className="h-5 w-5" />} title="Aktif" value={overview.active.toLocaleString("id-ID")} deltaTone="positive" />
        <StatCard icon={<Truck className="h-5 w-5" />} title="Nonaktif" value={overview.inactive.toLocaleString("id-ID")} />
      </div>

      <SuppliersTable
        q={result.q}
        items={result.items.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          address: c.address,
          isActive: c.isActive,
          createdAt: c.createdAt.toISOString(),
        }))}
      />

      <Card className="rounded-2xl">
        <CardContent className="flex items-center justify-between py-4 text-sm text-muted-foreground">
          <div>
            Menampilkan {result.items.length} dari {result.total} supplier • Page {result.page}/{totalPages}
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-xl" disabled={result.page <= 1}>
              <Link href={`/suppliers?${new URLSearchParams({ ...(q ? { q } : {}), page: String(prevPage) }).toString()}`}>Prev</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-xl" disabled={result.page >= totalPages}>
              <Link href={`/suppliers?${new URLSearchParams({ ...(q ? { q } : {}), page: String(nextPage) }).toString()}`}>Next</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
