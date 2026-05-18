"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ActionResult } from "@/lib/action";
import { isAppError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { requireActiveTenant } from "@/lib/tenant-guards";
import { createSaleSchema } from "@/modules/transactions/validators";
import { createSale, deleteSale } from "@/modules/transactions/service";

export async function createSaleAction(payload: unknown): Promise<ActionResult<{ id: string; invoiceNo: string }>> {
  try {
    await requirePermission(PERMISSIONS.sales_write);
    const ctx = await requireActiveTenant();

    const parsed = createSaleSchema.safeParse(payload);
    if (!parsed.success) return { ok: false, message: "Validasi gagal." };

    const created = await createSale({ tenantId: ctx.tenantId, cashierId: ctx.userId, input: parsed.data });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "CREATE",
      entity: "Sale",
      entityId: created.id,
      metadata: { invoiceNo: created.invoiceNo, total: created.total },
    });

    revalidatePath("/pos");
    revalidatePath("/pos/history");
    return { ok: true, data: { id: created.id, invoiceNo: created.invoiceNo } };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat membuat transaksi." };
  }
}

export async function deleteSaleAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.sales_delete);
    const ctx = await requireActiveTenant();

    if (!id) return { ok: false, message: "ID tidak valid." };
    await deleteSale({ tenantId: ctx.tenantId, id });

    await prisma.auditLog.create({
      data: { tenantId: ctx.tenantId, userId: ctx.userId, action: "DELETE", entity: "Sale", entityId: id },
    });

    revalidatePath("/pos");
    revalidatePath("/pos/history");
    return { ok: true, data: { id } };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menghapus transaksi." };
  }
}
