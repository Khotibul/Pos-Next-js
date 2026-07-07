"use server";

import { ActionResult, actionFail, actionOk, fieldErrorsFromZod } from "@/shared/server/errors/result";
import { isAppError } from "@/shared/server/errors/app-error";
import { PERMISSIONS } from "@/shared/constants/permissions";
import { requirePermission } from "@/shared/server/auth/permissions";
import { requireActiveTenant } from "@/lib/tenant-guards";
import { writeAuditLog } from "@/shared/server/audit/index";
import { writeErrorLog } from "@/shared/server/monitoring/log-service";
import { createProductSchema, updateProductSchema } from "@/features/products/validators";
import { createProduct, updateProduct, deleteProduct, deleteManyProducts } from "@/features/products/data/service";

function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) obj[k] = v;
  return obj;
}

export async function createProductAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.products_write);
    const ctx = await requireActiveTenant();

    const parsed = createProductSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return actionFail("Validasi gagal.", fieldErrorsFromZod(parsed.error));

    const created = await createProduct({ tenantId: ctx.tenantId, input: parsed.data });
    void writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "CREATE", entity: "Product", entityId: created.id });

    return actionOk({ id: created.id });
  } catch (err) {
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:products", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Terjadi kesalahan saat membuat produk.");
  }
}

export async function updateProductAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.products_write);
    const ctx = await requireActiveTenant();

    const parsed = updateProductSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return actionFail("Validasi gagal.", fieldErrorsFromZod(parsed.error));

    const updated = await updateProduct({ tenantId: ctx.tenantId, id: parsed.data.id, input: parsed.data });
    void writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "UPDATE", entity: "Product", entityId: updated.id });

    return actionOk({ id: updated.id });
  } catch (err) {
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:products", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Terjadi kesalahan saat mengubah produk.");
  }
}

export async function deleteProductAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.products_delete);
    const ctx = await requireActiveTenant();

    await deleteProduct({ tenantId: ctx.tenantId, id });
    void writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "DELETE", entity: "Product", entityId: id });

    return actionOk({ id });
  } catch (err) {
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:products", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Terjadi kesalahan saat menghapus produk.");
  }
}

export async function deleteManyProductsAction(ids: string[]): Promise<ActionResult<{ deletedCount: number }>> {
  try {
    await requirePermission(PERMISSIONS.products_delete);
    const ctx = await requireActiveTenant();

    const result = await deleteManyProducts({ tenantId: ctx.tenantId, ids });
    void writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "BULK_DELETE", entity: "Product", metadata: { deletedCount: result.count } });

    return actionOk({ deletedCount: result.count });
  } catch (err) {
    if (isAppError(err)) return actionFail(err.message);
    await writeErrorLog({ source: "feature:products", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : null });
    return actionFail("Terjadi kesalahan saat menghapus produk.");
  }
}
