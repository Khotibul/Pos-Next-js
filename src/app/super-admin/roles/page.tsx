import { PageHeader } from "@/components/layout/page-header";
import { requireSuperAdmin } from "@/lib/super-admin";
import { listAssignOptions } from "@/modules/super-admin/users/service";
import { listSuperAdminRoles } from "@/modules/super-admin/roles/service";
import { RolesTable } from "@/modules/super-admin/roles/components/roles-table";

export default async function SuperAdminRolesPage() {
  await requireSuperAdmin();
  const [roles, options] = await Promise.all([listSuperAdminRoles(), listAssignOptions()]);

  return (
    <div className="grid gap-6">
      <PageHeader title="Roles" description="Buat, clone, dan hapus role global maupun tenant-specific." />
      <RolesTable
        tenants={options.tenants}
        items={roles.map((role) => ({
          id: role.id,
          name: role.name,
          tenantId: role.tenantId,
          tenantName: role.tenant?.name ?? null,
          permissionCount: role._count.permissions,
          userCount: role._count.memberships,
          createdAt: role.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
