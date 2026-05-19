import { requireSuperAdmin } from "@/lib/super-admin";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default async function SuperAdminLicensesPage() {
  await requireSuperAdmin();
  return (
    <div className="grid gap-6">
      <PageHeader title="Lisensi Sistem" description="Manajemen lisensi tenant (setup tahap berikutnya)." />
      <Card className="rounded-2xl">
        <CardContent className="py-10 text-sm text-muted-foreground">
          Modul lisensi akan diaktifkan setelah model License dan enforcement middleware ditambahkan.
        </CardContent>
      </Card>
    </div>
  );
}

