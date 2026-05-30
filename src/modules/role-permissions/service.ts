import "server-only";

import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import { invalidatePermissionCache } from "@/lib/cache";
import type { UpdateRolePermissionsInput } from "@/modules/role-permissions/validators";

export async function listRoles({ tenantId }: { tenantId: string }) {
  return prisma.role.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function listPermissions({ tenantId }: { tenantId: string }) {
  return prisma.permission.findMany({
    where: { tenantId },
    orderBy: { key: "asc" },
    select: { id: true, key: true, name: true },
  });
}

export async function getRolePermissionIds({ tenantId, roleId }: { tenantId: string; roleId: string }) {
  const role = await prisma.role.findFirst({ where: { id: roleId, tenantId }, select: { id: true } });
  if (!role) throw Errors.notFound("Role tidak ditemukan.");
  const rows = await prisma.rolePermission.findMany({
    where: { roleId },
    select: { permissionId: true },
  });
  return rows.map((r) => r.permissionId);
}

export async function updateRolePermissions({ tenantId, input }: { tenantId: string; input: UpdateRolePermissionsInput }) {
  const role = await prisma.role.findFirst({ where: { id: input.roleId, tenantId }, select: { id: true } });
  if (!role) throw Errors.notFound("Role tidak ditemukan.");

  const allowedPerms = await prisma.permission.findMany({
    where: { tenantId, id: { in: input.permissionIds } },
    select: { id: true },
  });
  const allowedIds = new Set(allowedPerms.map((p) => p.id));
  const filtered = input.permissionIds.filter((id) => allowedIds.has(id));

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId: input.roleId } });
    if (filtered.length > 0) {
      await tx.rolePermission.createMany({
        data: filtered.map((permissionId) => ({ roleId: input.roleId, permissionId })),
        skipDuplicates: true,
      });
    }
  });

  await invalidatePermissionCache(tenantId);
  return { id: input.roleId };
}
