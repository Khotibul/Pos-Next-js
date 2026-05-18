"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, fieldErrorsFromZod } from "@/lib/action";
import { Errors, isAppError } from "@/lib/errors";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { requireActiveTenant } from "@/lib/tenant-guards";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { createProductSchema, updateProductSchema } from "@/modules/products/validators";
import { createProduct, deleteProduct, updateProduct } from "@/modules/products/service";
import { z } from "zod";

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
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };

    const created = await createProduct({ tenantId: ctx.tenantId, input: parsed.data });

    await writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "CREATE", entity: "Product", entityId: created.id });

    revalidatePath("/products");
    return { ok: true, data: created };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat membuat produk." };
  }
}

export async function updateProductAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.products_write);
    const ctx = await requireActiveTenant();

    const parsed = updateProductSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };

    const updated = await updateProduct({ tenantId: ctx.tenantId, id: parsed.data.id, input: parsed.data });

    await writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "UPDATE", entity: "Product", entityId: updated.id });

    revalidatePath("/products");
    revalidatePath(`/products/${updated.id}/edit`);
    return { ok: true, data: updated };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat mengubah produk." };
  }
}

export async function deleteProductAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.products_delete);
    const ctx = await requireActiveTenant();

    if (!id) throw Errors.badRequest("ID produk tidak valid.");
    await deleteProduct({ tenantId: ctx.tenantId, id });

    await writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "DELETE", entity: "Product", entityId: id });

    revalidatePath("/products");
    return { ok: true, data: { id } };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menghapus produk." };
  }
}

const bulkDeleteSchema = z.object({ ids: z.array(z.string().min(1)).min(1).max(200) });

export async function deleteManyProductsAction(ids: string[]): Promise<ActionResult<{ deletedCount: number }>> {
  try {
    await requirePermission(PERMISSIONS.products_delete);
    const ctx = await requireActiveTenant();

    const parsed = bulkDeleteSchema.safeParse({ ids });
    if (!parsed.success) return { ok: false, message: "Payload tidak valid." };

    const result = await prisma.product.deleteMany({
      where: { tenantId: ctx.tenantId, id: { in: parsed.data.ids } },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "BULK_DELETE",
      entity: "Product",
      metadata: { deletedCount: result.count },
    });

    revalidatePath("/products");
    return { ok: true, data: { deletedCount: result.count } };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menghapus produk." };
  }
}
