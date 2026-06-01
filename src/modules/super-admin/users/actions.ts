"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, fieldErrorsFromZod } from "@/lib/action";
import { writeAuditLog } from "@/lib/audit";
import { isAppError } from "@/lib/errors";
import { requireSuperAdmin } from "@/lib/super-admin";
import { formDataToRecord } from "@/modules/super-admin/shared";
import {
  assignTenantSchema,
  createUserSchema,
  removeTenantSchema,
  resetUserPasswordSchema,
  updateUserSchema,
  verifyUserEmailSchema,
} from "@/modules/super-admin/users/validators";
import {
  assignUserToTenant,
  createSuperAdminUser,
  removeUserFromTenant,
  resetSuperAdminUserPassword,
  updateSuperAdminUser,
  verifySuperAdminUserEmail,
} from "@/modules/super-admin/users/service";

function responseError(err: unknown, fallback: string): ActionResult<{ id: string }> {
  if (isAppError(err)) return { ok: false, message: err.message };
  return { ok: false, message: fallback };
}

export async function createUserAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireSuperAdmin();
    const parsed = createUserSchema.safeParse(formDataToRecord(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };
    const result = await createSuperAdminUser(parsed.data);
    await writeAuditLog({ userId: actor.id, action: "CREATE", entity: "User", entityId: result.id, metadata: { email: parsed.data.email } });
    revalidatePath("/super-admin/users");
    return { ok: true, data: result };
  } catch (err) {
    return responseError(err, "Gagal membuat user.");
  }
}

export async function updateUserAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireSuperAdmin();
    const parsed = updateUserSchema.safeParse(formDataToRecord(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };
    const result = await updateSuperAdminUser(parsed.data);
    await writeAuditLog({ userId: actor.id, action: "UPDATE", entity: "User", entityId: result.id, metadata: { isSuperAdmin: parsed.data.isSuperAdmin } });
    revalidatePath("/super-admin/users");
    revalidatePath(`/super-admin/users/${result.id}`);
    return { ok: true, data: result };
  } catch (err) {
    return responseError(err, "Gagal memperbarui user.");
  }
}

export async function resetUserPasswordAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireSuperAdmin();
    const parsed = resetUserPasswordSchema.safeParse(formDataToRecord(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };
    const result = await resetSuperAdminUserPassword(parsed.data);
    await writeAuditLog({ userId: actor.id, action: "RESET_PASSWORD", entity: "User", entityId: result.id });
    revalidatePath("/super-admin/users");
    return { ok: true, data: result };
  } catch (err) {
    return responseError(err, "Gagal reset password.");
  }
}

export async function verifyUserEmailAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireSuperAdmin();
    const parsed = verifyUserEmailSchema.safeParse(formDataToRecord(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };
    const result = await verifySuperAdminUserEmail(parsed.data.id);
    await writeAuditLog({ userId: actor.id, action: "VERIFY_EMAIL", entity: "User", entityId: result.id });
    revalidatePath("/super-admin/users");
    revalidatePath(`/super-admin/users/${result.id}`);
    return { ok: true, data: result };
  } catch (err) {
    return responseError(err, "Gagal verifikasi email.");
  }
}

export async function assignUserToTenantAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireSuperAdmin();
    const parsed = assignTenantSchema.safeParse(formDataToRecord(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };
    const result = await assignUserToTenant(parsed.data);
    await writeAuditLog({
      tenantId: result.tenantId,
      userId: actor.id,
      action: "ASSIGN_TENANT",
      entity: "TenantUser",
      entityId: result.id,
      metadata: { targetUserId: result.userId, roleId: parsed.data.roleId },
    });
    revalidatePath("/super-admin/users");
    revalidatePath(`/super-admin/users/${result.userId}`);
    return { ok: true, data: { id: result.id } };
  } catch (err) {
    return responseError(err, "Gagal assign tenant.");
  }
}

export async function removeUserFromTenantAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireSuperAdmin();
    const parsed = removeTenantSchema.safeParse(formDataToRecord(formData));
    if (!parsed.success) return { ok: false, message: "Validasi gagal.", fieldErrors: fieldErrorsFromZod(parsed.error) };
    const result = await removeUserFromTenant(parsed.data);
    await writeAuditLog({ tenantId: parsed.data.tenantId, userId: actor.id, action: "REMOVE_TENANT", entity: "TenantUser", metadata: { targetUserId: parsed.data.userId } });
    revalidatePath("/super-admin/users");
    revalidatePath(`/super-admin/users/${parsed.data.userId}`);
    return { ok: true, data: result };
  } catch (err) {
    return responseError(err, "Gagal menghapus membership.");
  }
}
