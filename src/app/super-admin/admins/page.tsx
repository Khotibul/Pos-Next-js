import { requireSuperAdmin } from "@/lib/super-admin";
import { PageHeader } from "@/components/layout/page-header";
import { AdminsTable } from "@/modules/super-admin/admins/components/admins-table";
import { listInternalAdmins } from "@/modules/super-admin/admins/service";

export default async function SuperAdminAdminsPage() {
  await requireSuperAdmin();
  const items = await listInternalAdmins();
  return (
    <div className="grid gap-6">
      <PageHeader title="Admin Internal" description="Kelola admin internal untuk platform SaaS." />
      <AdminsTable items={items.map((u) => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt.toISOString() }))} />
    </div>
  );
}

