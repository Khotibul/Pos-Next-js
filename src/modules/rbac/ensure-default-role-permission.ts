import "server-only";

import { prisma } from "@/lib/prisma";
import type { PermissionKey } from "@/lib/permissions-keys";
import { DEFAULT_PERMISSIONS, DEFAULT_ROLE_PERMISSION_MATRIX, DEFAULT_ROLES } from "@/modules/rbac/defaults";

type DefaultRoleName = (typeof DEFAULT_ROLES)[number];

function isDefaultRoleName(roleName: string | null): roleName is DefaultRoleName {
  return Boolean(roleName && (DEFAULT_ROLES as readonly string[]).includes(roleName));
}

export async function ensureDefaultRolePermission(params: {
  tenantId: string;
  roleName: string | null;
  permissionKey: PermissionKey;
}) {
  if (!isDefaultRoleName(params.roleName)) return false;
  if (!DEFAULT_ROLE_PERMISSION_MATRIX[params.roleName].includes(params.permissionKey)) return false;

  const permissionMeta = DEFAULT_PERMISSIONS.find((permission) => permission.key === params.permissionKey);
  if (!permissionMeta) return false;

  const [role, permission] = await Promise.all([
    prisma.role.findUnique({
      where: { tenantId_name: { tenantId: params.tenantId, name: params.roleName } },
      select: { id: true },
    }),
    prisma.permission.upsert({
      where: { tenantId_key: { tenantId: params.tenantId, key: params.permissionKey } },
      update: { name: permissionMeta.name },
      create: { tenantId: params.tenantId, key: permissionMeta.key, name: permissionMeta.name },
      select: { id: true },
    }),
  ]);

  if (!role) return false;

  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
    update: {},
    create: { roleId: role.id, permissionId: permission.id },
    select: { id: true },
  });

  return true;
}
