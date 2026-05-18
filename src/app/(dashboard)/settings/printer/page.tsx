import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { getPrinterSettings } from "@/modules/settings/printer/service";
import { updatePrinterSettingsAction } from "@/modules/settings/printer/actions";
import { PrinterSettingsForm } from "@/modules/settings/printer/components/printer-settings-form";

export default async function PrinterSettingsPage() {
  const ctx = await requirePermission(PERMISSIONS.settings_write);
  const settings = await getPrinterSettings({ tenantId: ctx.tenantId });

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Pengaturan Printer"
        description="Atur ukuran kertas struk, header/footer, dan auto print setelah transaksi."
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
              <Printer className="h-4 w-4" />
            </span>
            Printer & Struk
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Alert>
            Mode printing yang berjalan tanpa instalasi tambahan adalah <b>Browser Print</b> (membuka struk dan memanggil
            dialog print OS). Untuk direct ESC/POS via USB/Serial bisa ditambah berikutnya (opsional).
          </Alert>

          <PrinterSettingsForm initial={settings} action={updatePrinterSettingsAction} />
        </CardContent>
      </Card>
    </div>
  );
}
