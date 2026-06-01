import "server-only";

import { invalidateAuthUser } from "@/lib/auth-cache";
import { invalidatePermissionCache, invalidateTenantCache } from "@/lib/cache";

export type PaginationInput = {
  page?: number;
  pageSize?: number;
};

export function normalizePagination(input: PaginationInput) {
  const page = Math.max(1, Number(input.page ?? 1) || 1);
  const pageSize = Math.max(5, Math.min(Number(input.pageSize ?? 20) || 20, 100));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function stringOrNull(value: FormDataEntryValue | string | null | undefined) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

export function formDataToRecord(formData: FormData) {
  const record: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (record[key] === undefined) {
      record[key] = value;
      continue;
    }
    const previous = record[key];
    record[key] = Array.isArray(previous) ? [...previous, value] : [previous, value];
  }
  return record;
}

export async function invalidateSuperAdminUserTenantCaches(params: { userId?: string | null; tenantId?: string | null }) {
  const tasks: Array<Promise<void>> = [];
  if (params.userId) tasks.push(invalidateAuthUser(params.userId));
  if (params.tenantId) tasks.push(invalidateTenantCache(params.tenantId), invalidatePermissionCache(params.tenantId, params.userId));
  await Promise.all(tasks);
}
