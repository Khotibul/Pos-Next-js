import "server-only";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/super-admin";
import { Errors } from "@/lib/errors";
import { normalizePagination, stringOrNull, invalidateSuperAdminUserTenantCaches } from "@/modules/super-admin/shared";
import type { AssignTenantInput, CreateUserInput, RemoveTenantInput, ResetUserPasswordInput, UpdateUserInput } from "@/modules/super-admin/users/validators";

export type ListUsersParams = {
  q?: string | null;
  tenantId?: string | null;
  superAdmin?: string | null;
  verified?: string | null;
  page?: number;
  pageSize?: number;
};

export async function listSuperAdminUsers(params: ListUsersParams = {}) {
  await requireSuperAdmin();
  const { page, pageSize, skip } = normalizePagination(params);
  const q = params.q?.trim() || "";
  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(params.tenantId ? { memberships: { some: { tenantId: params.tenantId } } } : {}),
    ...(params.superAdmin === "1" ? { isSuperAdmin: true } : params.superAdmin === "0" ? { isSuperAdmin: false } : {}),
    ...(params.verified === "1" ? { emailVerified: { not: null } } : params.verified === "0" ? { emailVerified: null } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        emailVerified: true,
        isSuperAdmin: true,
        isActive: true,
        createdAt: true,
        _count: { select: { memberships: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total, page, pageSize, q };
}

export async function getSuperAdminUserDetail(userId: string) {
  await requireSuperAdmin();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true,
      emailVerified: true,
      isSuperAdmin: true,
      isActive: true,
      createdAt: true,
      memberships: {
        orderBy: { createdAt: "desc" },
        select: {
          tenantId: true,
          createdAt: true,
          tenant: { select: { id: true, name: true, slug: true, status: true } },
          role: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
        },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, action: true, entity: true, entityId: true, metadata: true, createdAt: true },
      },
    },
  });
  if (!user) throw Errors.notFound("User tidak ditemukan.");
  return user;
}

export async function listAssignOptions() {
  await requireSuperAdmin();
  const [tenants, roles, branches] = await Promise.all([
    prisma.tenant.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    prisma.role.findMany({ orderBy: [{ tenantId: "asc" }, { name: "asc" }], select: { id: true, name: true, tenantId: true } }),
    prisma.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, tenantId: true } }),
  ]);
  return { tenants, roles, branches };
}

export async function createSuperAdminUser(input: CreateUserInput) {
  await requireSuperAdmin();
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw Errors.badRequest("Email sudah digunakan.");
  const passwordHash = await bcrypt.hash(input.password, 12);
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: stringOrNull(input.phone),
      passwordHash,
      isSuperAdmin: input.isSuperAdmin,
      isActive: input.isActive,
      emailVerified: input.emailVerified ? new Date() : null,
    },
    select: { id: true },
  });
}

export async function updateSuperAdminUser(input: UpdateUserInput) {
  await requireSuperAdmin();
  const updated = await prisma.user.update({
    where: { id: input.id },
    data: {
      name: input.name,
      phone: stringOrNull(input.phone),
      isSuperAdmin: input.isSuperAdmin,
      isActive: input.isActive,
      emailVerified: input.emailVerified ? new Date() : null,
    },
    select: { id: true, memberships: { select: { tenantId: true } } },
  });
  await Promise.all(updated.memberships.map((m) => invalidateSuperAdminUserTenantCaches({ userId: updated.id, tenantId: m.tenantId })));
  await invalidateSuperAdminUserTenantCaches({ userId: updated.id });
  return { id: updated.id };
}

export async function resetSuperAdminUserPassword(input: ResetUserPasswordInput) {
  await requireSuperAdmin();
  const passwordHash = await bcrypt.hash(input.password, 12);
  const updated = await prisma.user.update({ where: { id: input.id }, data: { passwordHash }, select: { id: true } });
  await invalidateSuperAdminUserTenantCaches({ userId: updated.id });
  return updated;
}

export async function verifySuperAdminUserEmail(userId: string) {
  await requireSuperAdmin();
  const updated = await prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() }, select: { id: true } });
  await invalidateSuperAdminUserTenantCaches({ userId: updated.id });
  return updated;
}

export async function assignUserToTenant(input: AssignTenantInput) {
  await requireSuperAdmin();
  const role = await prisma.role.findFirst({
    where: { id: input.roleId, OR: [{ tenantId: input.tenantId }, { tenantId: null }] },
    select: { id: true },
  });
  if (!role) throw Errors.badRequest("Role tidak valid untuk tenant ini.");

  const branchId = stringOrNull(input.branchId);
  if (branchId) {
    const branch = await prisma.branch.findFirst({ where: { id: branchId, tenantId: input.tenantId }, select: { id: true } });
    if (!branch) throw Errors.badRequest("Cabang tidak valid untuk tenant ini.");
  }

  const result = await prisma.tenantUser.upsert({
    where: { tenantId_userId: { tenantId: input.tenantId, userId: input.userId } },
    update: { roleId: input.roleId, branchId },
    create: { tenantId: input.tenantId, userId: input.userId, roleId: input.roleId, branchId },
    select: { id: true, tenantId: true, userId: true },
  });
  await invalidateSuperAdminUserTenantCaches({ userId: result.userId, tenantId: result.tenantId });
  return result;
}

export async function removeUserFromTenant(input: RemoveTenantInput) {
  await requireSuperAdmin();
  await prisma.tenantUser.delete({ where: { tenantId_userId: { tenantId: input.tenantId, userId: input.userId } } });
  await invalidateSuperAdminUserTenantCaches({ userId: input.userId, tenantId: input.tenantId });
  return { id: input.userId };
}
