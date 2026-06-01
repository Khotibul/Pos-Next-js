import { PageHeader } from "@/components/layout/page-header";
import { requireSuperAdmin } from "@/lib/super-admin";
import { getPermissionMatrix } from "@/modules/super-admin/permissions/service";
import { PermissionMatrix } from "@/modules/super-admin/permissions/components/permission-matrix";

export default async function SuperAdminPermissionsPage() {
  await requireSuperAdmin();
  const matrix = await getPermissionMatrix();

  return (
    <div className="grid gap-6">
      <PageHeader title="Roles & Permissions" description="Kelola grant/revoke permission semua role dengan matrix table." />
      <PermissionMatrix
        roles={matrix.roles.map((role) => ({
          id: role.id,
          name: role.name,
          tenantName: role.tenant?.name ?? null,
          permissionIds: role.permissions.map((item) => item.permissionId),
        }))}
        permissions={matrix.permissions.map((permission) => ({
          id: permission.id,
          key: permission.key,
          name: permission.name,
          tenantName: permission.tenant?.name ?? null,
        }))}
      />
    </div>
  );
}
