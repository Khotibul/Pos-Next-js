import { requireSuperAdmin } from "@/lib/super-admin";
import { PageHeader } from "@/components/layout/page-header";
import { listLicenses } from "@/modules/licenses/service";
import { LicensesAdmin } from "@/modules/licenses/components/licenses-admin";

export default async function SuperAdminLicensesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const q = sp.q ?? null;
  const result = await listLicenses({ q, page: 1, pageSize: 50 });
  const items = result.items.map((x: (typeof result.items)[number]) => ({
    id: x.id,
    serial: x.serial,
    createdAt: x.createdAt.toISOString(),
    redeemedAt: x.redeemedAt ? x.redeemedAt.toISOString() : null,
    revokedAt: x.revokedAt ? x.revokedAt.toISOString() : null,
    expiresAt: x.expiresAt ? x.expiresAt.toISOString() : null,
    planName: x.plan?.name ?? x.plan?.slug ?? "-",
    tenantName: x.tenant?.name ?? null,
  }));
  return (
    <div className="grid gap-6">
      <PageHeader title="Lisensi Sistem" description="Generate serial number untuk aktivasi tenant." />
      <LicensesAdmin
        q={result.q}
        items={items}
      />
    </div>
  );
}
