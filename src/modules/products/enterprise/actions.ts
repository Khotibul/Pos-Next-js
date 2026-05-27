"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, fieldErrorsFromZod } from "@/lib/action";
import { isAppError } from "@/lib/errors";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { requireActiveTenant } from "@/lib/tenant-guards";
import {
  createAdjustmentSchema,
  createOpnameSchema,
  createProductVariantSchema,
  createTransferSchema,
  createWarehouseSchema,
  updateProductVariantSchema,
  updateWarehouseSchema,
} from "@/modules/products/enterprise/validators";
import {
  createProductVariant,
  createStockAdjustment,
  createStockOpname,
  createStockTransfer,
  createWarehouse,
  deleteProductVariant,
  deleteWarehouse,
  updateProductVariant,
  updateWarehouse,
} from "@/modules/products/enterprise/service";

function formDataToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) obj[k] = v;
  return obj;
}

export async function createWarehouseAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.products_write);
    const ctx = await requireActiveTenant();
    const parsed = createWarehouseSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };
    const created = await createWarehouse({ tenantId: ctx.tenantId, input: parsed.data });
    revalidatePath("/products");
    revalidatePath("/products/transfers");
    revalidatePath("/products/opname");
    return { ok: true, data: created };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat membuat gudang." };
  }
}

export async function updateWarehouseAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.products_write);
    const ctx = await requireActiveTenant();
    const parsed = updateWarehouseSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };
    const updated = await updateWarehouse({ tenantId: ctx.tenantId, input: parsed.data });
    revalidatePath("/products");
    revalidatePath("/products/transfers");
    revalidatePath("/products/opname");
    return { ok: true, data: updated };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat mengubah gudang." };
  }
}

export async function deleteWarehouseAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.products_write);
    const ctx = await requireActiveTenant();
    if (!id) return { ok: false, message: "ID tidak valid." };
    await deleteWarehouse({ tenantId: ctx.tenantId, id });
    revalidatePath("/products");
    revalidatePath("/products/transfers");
    revalidatePath("/products/opname");
    return { ok: true, data: { id } };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menghapus gudang." };
  }
}

export async function createVariantAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.products_write);
    const ctx = await requireActiveTenant();
    const parsed = createProductVariantSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };
    const created = await createProductVariant({ tenantId: ctx.tenantId, input: parsed.data });
    revalidatePath(`/products/${parsed.data.productId}`);
    return { ok: true, data: created };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat membuat variant." };
  }
}

export async function updateVariantAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.products_write);
    const ctx = await requireActiveTenant();
    const parsed = updateProductVariantSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };
    const updated = await updateProductVariant({ tenantId: ctx.tenantId, input: parsed.data });
    revalidatePath("/products");
    return { ok: true, data: updated };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat mengubah variant." };
  }
}

export async function deleteVariantAction(productId: string, id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.products_write);
    const ctx = await requireActiveTenant();
    if (!id) return { ok: false, message: "ID tidak valid." };
    await deleteProductVariant({ tenantId: ctx.tenantId, id });
    revalidatePath(`/products/${productId}`);
    return { ok: true, data: { id } };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat menghapus variant." };
  }
}

export async function createAdjustmentAction(payload: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.products_adjustment);
    const ctx = await requireActiveTenant();
    const parsed = createAdjustmentSchema.safeParse(payload);
    if (!parsed.success) return { ok: false, message: "Validasi gagal." };
    const created = await createStockAdjustment({ tenantId: ctx.tenantId, userId: ctx.userId, input: parsed.data });
    revalidatePath("/products");
    revalidatePath("/products/opname");
    return { ok: true, data: { id: created.id } };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat melakukan penyesuaian stok." };
  }
}

export async function createTransferAction(payload: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.products_transfer);
    const ctx = await requireActiveTenant();
    const parsed = createTransferSchema.safeParse(payload);
    if (!parsed.success) return { ok: false, message: "Validasi gagal." };
    const created = await createStockTransfer({ tenantId: ctx.tenantId, userId: ctx.userId, input: parsed.data });
    revalidatePath("/products");
    revalidatePath("/products/transfers");
    return { ok: true, data: { id: created.id } };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat transfer stok." };
  }
}

export async function createOpnameAction(payload: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.products_opname);
    const ctx = await requireActiveTenant();
    const parsed = createOpnameSchema.safeParse(payload);
    if (!parsed.success) return { ok: false, message: "Validasi gagal." };
    const created = await createStockOpname({ tenantId: ctx.tenantId, userId: ctx.userId, input: parsed.data });
    revalidatePath("/products");
    revalidatePath("/products/opname");
    return { ok: true, data: { id: created.id } };
  } catch (err) {
    if (isAppError(err)) return { ok: false, message: err.message };
    return { ok: false, message: "Terjadi kesalahan saat stock opname." };
  }
}

