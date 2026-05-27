"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, fieldErrorsFromZod } from "@/lib/action";
import { isAppError } from "@/lib/errors";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { requireActiveTenant } from "@/lib/tenant-guards";
import { writeAuditLog } from "@/lib/audit";
import { upsertProductPriceSchema } from "@/modules/products/prices/validators";
import { deleteProductPrice, upsertProductPrice } from "@/modules/products/prices/service";

function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) obj[k] = v;
  return obj;
}

export async function upsertProductPriceAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.products_price_manage);
    const ctx = await requireActiveTenant();

    const parsed = upsertProductPriceSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };

    const isUpdate = Boolean(parsed.data.id);
    const res = await upsertProductPrice({ tenantId: ctx.tenantId, userId: ctx.userId, input: parsed.data });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: isUpdate ? "UPDATE" : "CREATE",
      entity: "ProductPrice",
      entityId: res.id,
    });

    revalidatePath("/products/prices");
    revalidatePath("/products");
    return { ok: true, data: res };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menyimpan rule harga." };
  }
}

export async function deleteProductPriceAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.products_price_manage);
    const ctx = await requireActiveTenant();

    const res = await deleteProductPrice({ tenantId: ctx.tenantId, id });
    await writeAuditLog({ tenantId: ctx.tenantId, userId: ctx.userId, action: "DELETE", entity: "ProductPrice", entityId: res.id });

    revalidatePath("/products/prices");
    revalidatePath("/products");
    return { ok: true, data: res };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menghapus rule harga." };
  }
}

