import { requireSuperAdmin } from "@/lib/super-admin";
import { PageHeader } from "@/components/layout/page-header";
import { listAuditLogs } from "@/modules/super-admin/audit-logs/service";
import { AuditLogsTable } from "@/modules/super-admin/audit-logs/components/audit-logs-table";
import Link from "next/link";

export default async function SuperAdminAuditLogsPage(props: {
  searchParams: Promise<{ page?: string; pageSize?: string; tenantId?: string; action?: string; entity?: string }>;\n}) {
  await requireSuperAdmin();
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page ?? 1);
  const pageSize = Number(searchParams.pageSize ?? 20);
  
  const result = await listAuditLogs({
    page,
    pageSize,
    tenantId: searchParams.tenantId ?? null,
    action: searchParams.action ?? null,
    entity: searchParams.entity ?? null,
  });
  
  const totalPages = Math.ceil(result.total / result.pageSize);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  
  const buildLink = (p: number) => {
    const params = new URLSearchParams();
    params.set("pageSize", String(result.pageSize));
    if (searchParams.tenantId) params.set("tenantId", searchParams.tenantId);
    if (searchParams.action) params.set("action", searchParams.action);
    if (searchParams.entity) params.set("entity", searchParams.entity);
    params.set("page", String(p));
    return `/super-admin/audit-logs?${params.toString()}`;
  };
  
  return (
    <div className="grid gap-6">
      <PageHeader title="Audit Trail" description="Riwayat aktivitas lintas tenant." />
      <AuditLogsTable
        items={result.items.map((l) => ({
          id: l.id,
          tenant: l.tenant ? `${l.tenant.name} (${l.tenant.slug})` : null,
          user: l.user ? l.user.email ?? l.user.name ?? l.user.id : null,
          action: l.action,
          entity: l.entity,
          entityId: l.entityId ?? null,
          createdAt: l.createdAt.toISOString(),
        }))}
      />
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Halaman {result.page} dari {totalPages} ({result.total} total)
        </p>
        <div className="flex gap-2">
          {hasPrev && (
            <Link href={buildLink(page - 1)} className="rounded-md border px-3 py-1 text-sm hover:bg-muted">
              Previous
            </Link>
          )}
          {hasNext && (
            <Link href={buildLink(page + 1)} className="rounded-md border px-3 py-1 text-sm hover:bg-muted">
              Next
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

