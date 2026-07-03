import { requirePermission } from "@/lib/permissions";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { apiOk, withApiHandler } from "@/lib/api-response";
import { getOpenShift } from "@/modules/shifts/service";

export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  const ctx = await requirePermission(PERMISSIONS.transactions_shift_read);
  const open = await getOpenShift({ tenantId: ctx.tenantId, branchId: ctx.branchId, cashierId: ctx.userId });
  return apiOk({ shiftId: open?.id ?? null, status: open?.status ?? null, openedAt: open?.openedAt?.toISOString() ?? null });
});