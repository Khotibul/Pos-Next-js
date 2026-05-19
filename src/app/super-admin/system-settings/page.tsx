import { requireSuperAdmin } from "@/lib/super-admin";
import { PageHeader } from "@/components/layout/page-header";
import { listGlobalSettings } from "@/modules/super-admin/system-settings/service";
import { GlobalSettingsTable } from "@/modules/super-admin/system-settings/components/global-settings-table";

export default async function SuperAdminSystemSettingsPage() {
  await requireSuperAdmin();
  const items = await listGlobalSettings();
  return (
    <div className="grid gap-6">
      <PageHeader title="Pengaturan Global Aplikasi" description="Konfigurasi global untuk seluruh platform SaaS." />
      <GlobalSettingsTable
        items={items.map((s) => ({
          id: s.id,
          key: s.key,
          valueJson: JSON.stringify(s.value ?? null, null, 2),
          updatedAt: s.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}

