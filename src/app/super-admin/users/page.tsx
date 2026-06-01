import { PageHeader } from "@/components/layout/page-header";
import { requireSuperAdmin } from "@/lib/super-admin";
import { listAssignOptions, listSuperAdminUsers } from "@/modules/super-admin/users/service";
import { UsersTable } from "@/modules/super-admin/users/components/users-table";

export default async function SuperAdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tenantId?: string; superAdmin?: string; verified?: string; page?: string }>;
}) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const page = Number(sp.page ?? 1) || 1;
  const [result, options] = await Promise.all([
    listSuperAdminUsers({ q: sp.q, tenantId: sp.tenantId, superAdmin: sp.superAdmin, verified: sp.verified, page, pageSize: 20 }),
    listAssignOptions(),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader title="User Management" description="Kelola user global, verifikasi email, reset password, dan membership tenant." />
      <UsersTable
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        tenants={options.tenants}
        roles={options.roles}
        branches={options.branches}
        items={result.items.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          emailVerified: user.emailVerified ? user.emailVerified.toISOString() : null,
          isSuperAdmin: user.isSuperAdmin,
          isActive: user.isActive,
          tenantCount: user._count.memberships,
          createdAt: user.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
