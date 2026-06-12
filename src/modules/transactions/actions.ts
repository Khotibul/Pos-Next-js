"use server";

import { prisma } from "@/lib/prisma";
import { ActionResult } from "@/lib/action";
import { Errors, isAppError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/audit";
import { invalidateDashboardCache } from "@/lib/cache";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { requireActiveTenant } from "@/lib/tenant-guards";
import { createSaleSchema } from "@/modules/transactions/validators";
import { createSale } from "@/modules/transactions/service";
import { getOpenShift } from "@/modules/shifts/service";
import { checkIdempotencyKey, releaseIdempotencyKey } from "@/lib/transaction-cache";
import { createDevTimer } from "@/lib/perf";

export async function createSaleAction(payload: unknown): Promise<ActionResult<{ id: string; invoiceNo: string }>> {
  const endTotal = createDevTimer("pos.createSaleAction.total");
  let idempotencyRelease: { tenantId: string; key: string } | null = null;
  try {
    const endAuth = createDevTimer("pos.createSaleAction.auth");
    await requirePermission(PERMISSIONS.sales_write);
    const ctx = await requireActiveTenant();
    endAuth();

    const endValidate = createDevTimer("pos.createSaleAction.validate");
    const parsed = createSaleSchema.safeParse(payload);
    if (!parsed.success) return { ok: false, message: "Validasi gagal." };
    endValidate();

    const endIdempotency = createDevTimer("pos.createSaleAction.idempotency");
    const idempotencyRaw = parsed.data.payment.reference || `${ctx.userId}-${Date.now()}`;
    const idempotencyKey = `create:${ctx.tenantId}:${idempotencyRaw}`;
    idempotencyRelease = { tenantId: ctx.tenantId, key: idempotencyKey };
    const allowed = await checkIdempotencyKey(ctx.tenantId, idempotencyKey);
    if (!allowed) return { ok: false, message: "Transaksi sedang diproses. Harap tunggu." };
    endIdempotency();

    const endShiftCheck = createDevTimer("pos.createSaleAction.shiftCheck");
    const openShift = await getOpenShift({ tenantId: ctx.tenantId, branchId: ctx.branchId, cashierId: ctx.userId });
    if (!openShift) {
      await releaseIdempotencyKey(ctx.tenantId, idempotencyKey);
      return { ok: false, message: "Shift belum dibuka. Silakan buka shift terlebih dahulu." };
    }
    endShiftCheck();

    const created = await createSale({ tenantId: ctx.tenantId, cashierId: ctx.userId, shiftId: openShift.id, input: parsed.data });

    void Promise.allSettled([
      writeAuditLog({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        action: "CREATE",
        entity: "Sale",
        entityId: created.id,
        metadata: { invoiceNo: created.invoiceNo, total: created.total },
      }),
      invalidateDashboardCache(ctx.tenantId),
    ]);
    await releaseIdempotencyKey(ctx.tenantId, idempotencyKey);

    return { ok: true, data: { id: created.id, invoiceNo: created.invoiceNo } };
  } catch (err) {
    if (idempotencyRelease) {
      await releaseIdempotencyKey(idempotencyRelease.tenantId, idempotencyRelease.key).catch(() => {});
    }
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat membuat transaksi." };
  } finally {
    endTotal();
  }
}

export async function deleteSaleAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.sales_delete);
    const ctx = await requireActiveTenant();

    if (!id) return { ok: false, message: "ID tidak valid." };
    await prisma.$transaction(async (tx) => {
      const exists = await tx.sale.findFirst({ where: { tenantId: ctx.tenantId, id }, select: { id: true } });
      if (!exists) throw Errors.notFound("Transaksi tidak ditemukan.");

      await tx.sale.delete({ where: { id } });
      await tx.auditLog.create({
        data: { tenantId: ctx.tenantId, userId: ctx.userId, action: "DELETE", entity: "Sale", entityId: id },
      });
    });
    void invalidateDashboardCache(ctx.tenantId);

    return { ok: true, data: { id } };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menghapus transaksi." };
  }
}
