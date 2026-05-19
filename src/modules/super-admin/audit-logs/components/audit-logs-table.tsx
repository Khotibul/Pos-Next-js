import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = {
  id: string;
  tenant: string | null;
  user: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
};

export function AuditLogsTable({ items }: { items: Row[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-background">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead>Waktu</TableHead>
            <TableHead>Tenant</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>Entity ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                Belum ada audit log.
              </TableCell>
            </TableRow>
          ) : (
            items.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="whitespace-nowrap text-sm">{new Date(l.createdAt).toLocaleString("id-ID")}</TableCell>
                <TableCell className="text-sm">{l.tenant ?? "-"}</TableCell>
                <TableCell className="text-sm">{l.user ?? "-"}</TableCell>
                <TableCell className="font-mono text-xs">{l.action}</TableCell>
                <TableCell className="font-mono text-xs">{l.entity}</TableCell>
                <TableCell className="font-mono text-xs">{l.entityId ?? "-"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

