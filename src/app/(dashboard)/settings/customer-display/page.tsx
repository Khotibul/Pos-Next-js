import Link from "next/link";
import { ArrowLeft, MonitorSmartphone } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { getCustomerDisplaySettings } from "@/modules/settings/customer-display/service";
import { updateCustomerDisplaySettingsAction } from "@/modules/settings/customer-display/actions";
import { CustomerDisplaySettingsForm } from "@/modules/settings/customer-display/components/customer-display-settings-form";

export default async function CustomerDisplaySettingsPage() {
  const ctx = await requirePermission(PERMISSIONS.settings_write);
  const settings = await getCustomerDisplaySettings({ tenantId: ctx.tenantId });

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Customer Display"
        description="Atur layar pelanggan untuk menampilkan item belanja, total, pembayaran, dan pesan promo."
        actions={
          <Button asChild variant="outline" className="gap-2 rounded-xl">
            <Link href="/settings">
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Link>
          </Button>
        }
      />

      <Card className="rounded-2xl">
        <CardHeader className="py-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary">
              <MonitorSmartphone className="h-4 w-4" />
            </span>
            Pengaturan Layar Pelanggan
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Alert>
            Customer display disimpan per tenant dan siap dipakai untuk layar kedua desktop, tablet pelanggan, atau URL display
            khusus. Integrasi real-time ke POS dapat memakai setting ini sebagai sumber konfigurasi.
          </Alert>

          <CustomerDisplaySettingsForm initial={settings} action={updateCustomerDisplaySettingsAction} />
        </CardContent>
      </Card>
    </div>
  );
}
