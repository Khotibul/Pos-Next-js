import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRightLeft, ClipboardCheck } from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";

export default async function InventoryPage() {
  await requirePermission(PERMISSIONS.inventory_read);
  return (
    <div className="grid gap-4">
      <PageHeader title="Inventory" description="Kelola stok per cabang/gudang dengan audit trail." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader className="py-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary">
                <ArrowRightLeft className="h-4 w-4" />
              </span>
              Stock Movement
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Stok masuk, keluar, transfer antar cabang.</CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="py-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary">
                <ClipboardCheck className="h-4 w-4" />
              </span>
              Stock Opname
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Opname, penyesuaian, kartu stok.</CardContent>
        </Card>
      </div>
    </div>
  );
}
