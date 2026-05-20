import { PageHeader } from "@/components/layout/page-header";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { listRoles } from "@/modules/role-permissions/service";
import { listBranchOptions } from "@/modules/branches/service";
import { listStaff } from "@/modules/staff/service";
import { StaffTable } from "@/modules/staff/components/staff-table";

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const ctx = await requirePermission(PERMISSIONS.staff_read);
  const sp = await searchParams;
  const q = sp.q ?? null;

  const [roles, branches, result] = await Promise.all([
    listRoles({ tenantId: ctx.tenantId }),
    listBranchOptions({ tenantId: ctx.tenantId }),
    listStaff({ tenantId: ctx.tenantId, q }),
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader title="Pegawai" description="Buat akun Manager/Gudang/Akuntan/Kasir dan atur role + cabang." />
      <StaffTable
        q={result.q}
        roles={roles}
        branches={branches}
        items={result.items.map((m) => ({
          id: m.id,
          userId: m.user.id,
          name: m.user.name ?? "-",
          email: m.user.email ?? "-",
          phone: m.user.phone ?? null,
          emailVerified: Boolean(m.user.emailVerified),
          roleId: m.role?.id ?? "",
          roleName: m.role?.name ?? "-",
          branchId: m.branch?.id ?? null,
          branchName: m.branch?.name ?? null,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}

