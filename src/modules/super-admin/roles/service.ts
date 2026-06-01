import "server-only";

import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import { requireSuperAdmin } from "@/lib/super-admin";
import { invalidatePermissionCache } from "@/lib/cache";
import { stringOrNull } from "@/modules/super-admin/shared";
import type { CloneRoleInput, CreateRoleInput } from "@/modules/super-admin/roles/validators";

export async function listSuperAdminRoles() {
  await requireSuperAdmin();
  return prisma.role.findMany({
    orderBy: [{ tenantId: "asc" }, { name: "asc" }],
    select: {
      id: true,
      tenantId: true,
      name: true,
      createdAt: true,
      tenant: { select: { id: true, name: true, slug: true } },
      _count: { select: { memberships: true, permissions: true } },
    },
  });
}

export async function createSuperAdminRole(input: CreateRoleInput) {
  await requireSuperAdmin();
  const tenantId = stringOrNull(input.tenantId);
  return prisma.role.create({ data: { tenantId, name: input.name }, select: { id: true, tenantId: true } });
}

export async function cloneSuperAdminRole(input: CloneRoleInput) {
  await requireSuperAdmin();
  const source = await prisma.role.findUnique({
    where: { id: input.roleId },
    select: { id: true, permissions: { select: { permissionId: true } } },
  });
  if (!source) throw Errors.notFound("Role sumber tidak ditemukan.");
  const tenantId = stringOrNull(input.tenantId);
  return prisma.role.create({
    data: {
      tenantId,
      name: input.name,
      permissions: { create: source.permissions.map((permission) => ({ permissionId: permission.permissionId })) },
    },
    select: { id: true, tenantId: true },
  });
}

export async function deleteSuperAdminRole(roleId: string) {
  await requireSuperAdmin();
  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { id: true, tenantId: true, _count: { select: { memberships: true } } } });
  if (!role) throw Errors.notFound("Role tidak ditemukan.");
  if (role._count.memberships > 0) throw Errors.badRequest("Role masih dipakai oleh user.");
  await prisma.role.delete({ where: { id: roleId } });
  if (role.tenantId) await invalidatePermissionCache(role.tenantId);
  return { id: roleId };
}
