import { requireSuperAdmin } from "@/lib/super-admin";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default async function SuperAdminInvoicesPage() {
  await requireSuperAdmin();
  return (
    <div className="grid gap-6">
      <PageHeader title="Invoice Langganan" description="Manajemen invoice langganan tenant (setup tahap berikutnya)." />
      <Card className="rounded-2xl">
        <CardContent className="py-10 text-sm text-muted-foreground">
          Modul invoice akan diaktifkan saat skema Subscription/Billing selesai (Invoice, Payment, Midtrans/Xendit).
        </CardContent>
      </Card>
    </div>
  );
}

