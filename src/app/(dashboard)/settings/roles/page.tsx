import { PageHeader } from "@/components/layout/page-header";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { listPermissions, listRoles, getRolePermissionIds } from "@/modules/role-permissions/service";
import { RolePermissionsEditor } from "@/modules/role-permissions/components/role-permissions-editor";

export default async function RolesPermissionsPage() {
  const ctx = await requirePermission(PERMISSIONS.settings_read);
  const [roles, permissions] = await Promise.all([
    listRoles({ tenantId: ctx.tenantId }),
    listPermissions({ tenantId: ctx.tenantId }),
  ]);

  const initialRoleId = roles[0]?.id ?? null;
  const map: Record<string, string[]> = {};
  for (const r of roles) {
    map[r.id] = await getRolePermissionIds({ tenantId: ctx.tenantId, roleId: r.id });
  }

  return (
    <div className="grid gap-4">
      <PageHeader title="Role & Permission" description="Atur akses fitur per role (RBAC)." />
      <RolePermissionsEditor roles={roles} permissions={permissions} initialRoleId={initialRoleId} initialPermissionIds={map} />
    </div>
  );
}

