import "server-only";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/super-admin";
import { invalidatePermissionCache } from "@/lib/cache";

export async function getPermissionMatrix() {
  await requireSuperAdmin();
  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      orderBy: [{ tenantId: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        tenantId: true,
        tenant: { select: { name: true, slug: true } },
        permissions: { select: { permissionId: true } },
      },
    }),
    prisma.permission.findMany({
      orderBy: [{ tenantId: "asc" }, { key: "asc" }],
      select: { id: true, key: true, name: true, tenantId: true, tenant: { select: { name: true, slug: true } } },
    }),
  ]);
  return { roles, permissions };
}

export async function updatePermissionMatrix(grants: Map<string, Set<string>>) {
  await requireSuperAdmin();
  const roles = await prisma.role.findMany({ where: { id: { in: [...grants.keys()] } }, select: { id: true, tenantId: true } });
  await prisma.$transaction(
    roles.map((role) =>
      prisma.rolePermission.deleteMany({
        where: { roleId: role.id },
      })
    )
  );
  const createRows = roles.flatMap((role) => [...(grants.get(role.id) ?? new Set<string>())].map((permissionId) => ({ roleId: role.id, permissionId })));
  if (createRows.length > 0) {
    await prisma.rolePermission.createMany({ data: createRows, skipDuplicates: true });
  }
  await Promise.all(roles.map((role) => (role.tenantId ? invalidatePermissionCache(role.tenantId) : Promise.resolve())));
  return { id: "permission-matrix" };
}
