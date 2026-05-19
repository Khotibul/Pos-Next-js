import { requireSuperAdmin } from "@/lib/super-admin";
import { PageHeader } from "@/components/layout/page-header";
import { listAuditLogs } from "@/modules/super-admin/audit-logs/service";
import { AuditLogsTable } from "@/modules/super-admin/audit-logs/components/audit-logs-table";

export default async function SuperAdminAuditLogsPage() {
  await requireSuperAdmin();
  const items = await listAuditLogs(250);
  return (
    <div className="grid gap-6">
      <PageHeader title="Audit Trail" description="Riwayat aktivitas lintas tenant." />
      <AuditLogsTable
        items={items.map((l) => ({
          id: l.id,
          tenant: l.tenant ? `${l.tenant.name} (${l.tenant.slug})` : null,
          user: l.user ? l.user.email ?? l.user.name ?? l.user.id : null,
          action: l.action,
          entity: l.entity,
          entityId: l.entityId ?? null,
          createdAt: l.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}

