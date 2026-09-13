import Link from "next/link";
import { HandCoins, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PERMISSIONS } from "@/shared/constants/permissions";
import { requirePermission } from "@/shared/server/auth/permissions";
import { getPayableOverview, listPayables } from "@/features/payables/data/service";
import { PayablesTable } from "@/components/payables/payables-table";
import { prisma } from "@/shared/server/db/prisma";

export const dynamic = "force-dynamic";

export default async function PayablesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const ctx = await requirePermission(PERMISSIONS.payables_read);
  const sp = await searchParams;
  const q = sp.q ?? null;
  const status = sp.status ?? null;
  const page = sp.page ? Number(sp.page) : 1;

  const [overview, result, suppliers] = await Promise.all([
    getPayableOverview({ tenantId: ctx.tenantId }),
    listPayables({ tenantId: ctx.tenantId, q, status, page: Number.isFinite(page) ? page : 1, pageSize: 10 }),
    prisma.supplier.findMany({ where: { tenantId: ctx.tenantId }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 200 }),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const prevPage = Math.max(1, result.page - 1);
  const nextPage = Math.min(totalPages, result.page + 1);

  function qs(pageNum: number) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (status) p.set("status", status);
    p.set("page", String(pageNum));
    return p.toString();
  }

  const fmt = (n: number) => n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

  return (
    <div className="grid gap-4">
      <PageHeader title="Utang" description="Kelola utang ke supplier — catat, cicil, dan pantau jatuh tempo." />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<HandCoins className="h-5 w-5" />} title="Total Utang" value={fmt(overview.totalPayable)} />
        <StatCard icon={<Clock className="h-5 w-5" />} title="Sisa Utang" value={fmt(overview.totalRemaining)} tone="slate" />
        <StatCard icon={<AlertTriangle className="h-5 w-5" />} title="Belum Lunas" value={`${overview.unpaid + overview.partial + overview.overdue}`} deltaTone="positive" />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} title="Lunas" value={`${overview.paid}`} tone="slate" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs text-muted-foreground">
        <div>Tagihan: {result.total} • Hal {result.page}/{totalPages}</div>
        <div>UNPAID: {overview.unpaid}</div>
        <div>PARTIAL: {overview.partial}</div>
        <div>OVERDUE: {overview.overdue}</div>
      </div>

      <PayablesTable
        q={result.q}
        status={result.status}
        suppliers={suppliers}
        items={result.items.map((r: (typeof result.items)[number]) => ({
          id: r.id,
          invoiceNo: r.invoiceNo,
          description: r.description,
          supplierId: r.supplierId,
          supplierName: r.supplierName,
          totalAmount: r.totalAmount,
          paidAmount: r.paidAmount,
          remainingAmount: r.remainingAmount,
          dueDate: r.dueDate ? r.dueDate.toISOString() : null,
          status: r.status as string,
          createdAt: r.createdAt.toISOString(),
        }))}
      />

      <Card className="rounded-2xl">
        <CardContent className="flex items-center justify-between py-4 text-sm text-muted-foreground">
          <div>Menampilkan {result.items.length} dari {result.total} utang • Page {result.page}/{totalPages}</div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-xl" disabled={result.page <= 1}><Link href={`/payables?${qs(prevPage)}`}>Prev</Link></Button>
            <Button asChild variant="outline" size="sm" className="rounded-xl" disabled={result.page >= totalPages}><Link href={`/payables?${qs(nextPage)}`}>Next</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
