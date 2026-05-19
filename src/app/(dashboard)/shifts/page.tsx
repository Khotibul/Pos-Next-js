import { PageHeader } from "@/components/layout/page-header";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { getOpenShift, listShifts } from "@/modules/shifts/service";
import { ShiftsTable } from "@/modules/shifts/components/shifts-table";

export default async function ShiftsPage() {
  const ctx = await requirePermission(PERMISSIONS.sales_read);
  const [items, open] = await Promise.all([
    listShifts({ tenantId: ctx.tenantId, take: 50 }),
    getOpenShift({ tenantId: ctx.tenantId, cashierUserId: ctx.userId }),
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader title="Shift Kasir" description="Buka/tutup shift kasir dan rekap kas." />
      <ShiftsTable
        openShiftId={open?.id ?? null}
        items={items.map((s) => ({
          id: s.id,
          status: s.status,
          cashierName: s.cashier.name ?? s.cashier.email ?? s.cashier.id,
          openedAt: s.openedAt.toISOString(),
          closedAt: s.closedAt ? s.closedAt.toISOString() : null,
          openingCash: Number(s.openingCash),
          closingCash: Number(s.closingCash),
        }))}
      />
    </div>
  );
}

