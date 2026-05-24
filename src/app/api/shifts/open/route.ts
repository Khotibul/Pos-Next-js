import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { getOpenShift } from "@/modules/shifts/service";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requirePermission(PERMISSIONS.transactions_shift_read);
  const open = await getOpenShift({ tenantId: ctx.tenantId, branchId: ctx.branchId, cashierId: ctx.userId });
  return NextResponse.json({
    ok: true,
    data: { shiftId: open?.id ?? null, status: open?.status ?? null, openedAt: open?.openedAt?.toISOString() ?? null },
  });
}

