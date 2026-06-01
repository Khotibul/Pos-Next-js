import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { requireSuperAdmin } from "@/lib/super-admin";
import { getSuperAdminUserDetail } from "@/modules/super-admin/users/service";
import { UserDetailPanel } from "@/modules/super-admin/users/components/user-detail-panel";

export default async function SuperAdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const p = await params;
  const user = await getSuperAdminUserDetail(p.id);

  return (
    <div className="grid gap-6">
      <PageHeader
        title={user.name ?? user.email ?? "Detail User"}
        description="Profile user, tenant membership, role, dan audit log."
        actions={
          <Button asChild variant="outline" className="gap-2 rounded-xl">
            <Link href="/super-admin/users">
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Link>
          </Button>
        }
      />
      <UserDetailPanel
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          emailVerified: user.emailVerified ? user.emailVerified.toISOString() : null,
          isSuperAdmin: user.isSuperAdmin,
          isActive: user.isActive,
          createdAt: user.createdAt.toISOString(),
        }}
        memberships={user.memberships.map((membership) => ({
          tenantId: membership.tenantId,
          tenantName: membership.tenant.name,
          tenantSlug: membership.tenant.slug,
          tenantStatus: membership.tenant.status,
          roleName: membership.role?.name ?? null,
          branchName: membership.branch?.name ?? null,
          createdAt: membership.createdAt.toISOString(),
        }))}
        auditLogs={user.auditLogs.map((log) => ({
          id: log.id,
          action: log.action,
          entity: log.entity,
          entityId: log.entityId,
          createdAt: log.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
