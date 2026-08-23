"use server";

import crypto from "node:crypto";
import { ActionResult, actionFail, actionOk } from "@/shared/server/errors/result";
import { isAppError } from "@/shared/server/errors/app-error";
import { requirePermission } from "@/shared/server/auth/permissions";
import { requireActiveTenant } from "@/lib/tenant-guards";
import { PERMISSIONS } from "@/shared/constants/permissions";
import { createSaleSchema } from "@/features/transactions/validators";
import { createSaleUseCase } from "@/features/transactions/domain/create-sale.usecase";
import { getOpenShift } from "@/modules/shifts/service";
import { checkIdempotencyKey, releaseIdempotencyKey } from "@/lib/transaction-cache";
import { writeAuditLog } from "@/shared/server/audit/index";
import { invalidateDashboardCache } from "@/shared/server/cache/index";
import { invalidateCachedProduct } from "@/lib/transaction-cache";
import { writeErrorLog } from "@/shared/server/monitoring/log-service";
import { createDevTimer } from "@/shared/utils/perf";

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
    if (!parsed.success) return actionFail("Validasi gagal.");
    endValidate();

    const endIdempotency = createDevTimer("pos.createSaleAction.idempotency");
    const idempotencyRaw = parsed.data.payment.reference?.trim() || crypto.randomUUID();
    const idempotencyKey = `create:${ctx.tenantId}:${idempotencyRaw}`;
    idempotencyRelease = { tenantId: ctx.tenantId, key: idempotencyKey };
    const allowed = await checkIdempotencyKey(ctx.tenantId, idempotencyKey);
    if (!allowed) return actionFail("Transaksi sedang diproses. Harap tunggu.");
    endIdempotency();

    const endShiftCheck = createDevTimer("pos.createSaleAction.shiftCheck");
    const openShift = await getOpenShift({ tenantId: ctx.tenantId, branchId: ctx.branchId, cashierId: ctx.userId });
    if (!openShift) {
      await releaseIdempotencyKey(ctx.tenantId, idempotencyKey);
      return actionFail("Shift belum dibuka. Silakan buka shift terlebih dahulu.");
    }
    endShiftCheck();

    const created = await createSaleUseCase({
      tenantId: ctx.tenantId,
      cashierId: ctx.userId,
      branchId: ctx.branchId,
      shiftId: openShift.id,
      input: parsed.data,
    });

    const productIds = parsed.data.items.map((i) => i.productId);
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
      ...productIds.map((pid) => invalidateCachedProduct(ctx.tenantId, pid)),
      releaseIdempotencyKey(ctx.tenantId, idempotencyKey),
    ]);

    return actionOk({ id: created.id, invoiceNo: created.invoiceNo });
  } catch (err) {
    if (idempotencyRelease) {
      await releaseIdempotencyKey(idempotencyRelease.tenantId, idempotencyRelease.key).catch(() => {});
    }
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({
      source: "module:transactions",
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : null,
    });
    return actionFail("Terjadi kesalahan saat membuat transaksi.");
  } finally {
    endTotal();
  }
}

export async function deleteSaleAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.sales_delete);
    const ctx = await requireActiveTenant();
    const { deleteSaleById, findSale } = await import("@/features/transactions/data/repository");
    const exists = await findSale(ctx.tenantId, id);
    if (!exists) return actionFail("Transaksi tidak ditemukan.");
    await deleteSaleById(id);

    void writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "DELETE",
      entity: "Sale",
      entityId: id,
    });

    return actionOk({ id });
  } catch (err) {
    if (isAppError(err)) return actionFail(err.message);
    return actionFail("Gagal menghapus transaksi.");
  }
}
