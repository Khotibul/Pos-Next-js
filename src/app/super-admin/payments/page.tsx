import { requireSuperAdmin } from "@/lib/super-admin";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default async function SuperAdminPaymentsPage() {
  await requireSuperAdmin();
  return (
    <div className="grid gap-6">
      <PageHeader title="Pembayaran Langganan" description="Riwayat pembayaran tenant (setup tahap berikutnya)." />
      <Card className="rounded-2xl">
        <CardContent className="py-10 text-sm text-muted-foreground">
          Modul pembayaran akan diaktifkan setelah integrasi Payment Gateway (Midtrans/Xendit) dan invoice tersedia.
        </CardContent>
      </Card>
    </div>
  );
}

