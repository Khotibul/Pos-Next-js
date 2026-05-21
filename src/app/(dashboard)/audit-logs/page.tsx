import { PageHeader } from "@/components/layout/page-header";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { listTenantAuditLogs } from "@/modules/audit-logs/service";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function TenantAuditLogsPage() {
  const ctx = await requirePermission(PERMISSIONS.settings_read);
  const items = await listTenantAuditLogs({ tenantId: ctx.tenantId, take: 250 });

  return (
    <div className="grid gap-4">
      <PageHeader title="Audit Log" description="Riwayat aktivitas user di tenant ini." />
      <div className="overflow-x-auto rounded-2xl border bg-background">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Entity ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Belum ada audit log.
                </TableCell>
              </TableRow>
            ) : (
              items.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-sm">{new Date(l.createdAt).toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-sm">{l.user ? l.user.email ?? l.user.name ?? l.user.id : "-"}</TableCell>
                  <TableCell className="font-mono text-xs">{l.action}</TableCell>
                  <TableCell className="font-mono text-xs">{l.entity}</TableCell>
                  <TableCell className="font-mono text-xs">{l.entityId ?? "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

