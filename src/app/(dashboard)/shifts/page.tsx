import { PageHeader } from "@/components/layout/page-header";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { getOpenShift, listShifts } from "@/modules/shifts/service";
import { ShiftTable } from "@/components/shifts/shift-table";

export default async function ShiftsPage() {
  const ctx = await requirePermission(PERMISSIONS.transactions_shift_read);
  const canManageAllShifts = ctx.isSuperAdmin || ["OWNER", "ADMIN", "BRANCH_MANAGER"].includes(ctx.roleName ?? "");
  const [items, open] = await Promise.all([
    listShifts({ tenantId: ctx.tenantId, cashierId: canManageAllShifts ? null : ctx.userId, take: 50 }),
    getOpenShift({ tenantId: ctx.tenantId, branchId: ctx.branchId, cashierId: ctx.userId }),
  ]);

  const can = (p: string) => ctx.isSuperAdmin || ctx.permissions.includes(p);

  return (
    <div className="grid gap-4">
      <PageHeader title="Shiftbook" description="Buka/tutup shift kasir dan rekap kas per shift." />
      <ShiftTable
        openShiftId={open?.id ?? null}
        items={items.map((s) => ({
          id: s.id,
          status: s.status,
          cashierId: s.cashier.id,
          cashierName: s.cashier.name ?? s.cashier.email ?? s.cashier.id,
          branchName: s.branch.name,
          openedAt: s.openedAt.toISOString(),
          closedAt: s.closedAt ? s.closedAt.toISOString() : null,
          openingCash: Number(s.openingCash),
          totalSales: Number(s.totalSales),
          cashSystem: Number(s.cashSystem),
          cashCounted: s.cashCounted == null ? null : Number(s.cashCounted),
          cashDifference: Number(s.cashDifference),
        }))}
        canOpen={can(PERMISSIONS.transactions_shift_open)}
        canClose={can(PERMISSIONS.transactions_shift_close)}
        canManageAll={canManageAllShifts}
        currentUserId={ctx.userId}
      />
    </div>
  );
}
