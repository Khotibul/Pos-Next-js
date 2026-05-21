import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Receipt, Timer } from "lucide-react";
import { RedeemLicenseCard } from "@/modules/licenses/components/redeem-license-card";
import { Alert } from "@/components/ui/alert";

export default async function BillingPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = (await searchParams) ?? {};
  const activationFailed = sp.activation === "failed";
  const ctx = await requirePermission(PERMISSIONS.billing_read);
  return (
    <div className="grid gap-4">
      <PageHeader title="Billing" description="Langganan paket, invoice otomatis, payment gateway." />

      {activationFailed ? (
        <Alert variant="destructive">Serial number tidak valid atau sudah digunakan. Tenant tetap dibuat dalam mode trial, silakan coba aktivasi lagi.</Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader className="py-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary">
                <CreditCard className="h-4 w-4" />
              </span>
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Status tenant:</span>
              <Badge variant={ctx.tenantStatus === "ACTIVE" ? "default" : ctx.tenantStatus === "TRIAL" ? "secondary" : "destructive"}>
                {ctx.tenantStatus}
              </Badge>
              {ctx.tenantStatus === "TRIAL" && ctx.tenantTrialEndsAt ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                  <Timer className="h-3.5 w-3.5" />
                  Trial sampai {new Date(ctx.tenantTrialEndsAt).toLocaleDateString("id-ID")}
                </span>
              ) : null}
            </div>
            <div className="text-muted-foreground">Modul billing SaaS akan mengelola paket, invoice, dan pembayaran.</div>
          </CardContent>
        </Card>

        {ctx.tenantStatus === "ACTIVE" ? (
          <Card className="rounded-2xl">
            <CardHeader className="py-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Receipt className="h-4 w-4" />
                </span>
                Invoice & Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Integrasi Midtrans/Xendit dan riwayat pembayaran.</CardContent>
          </Card>
        ) : (
          <RedeemLicenseCard />
        )}
      </div>
    </div>
  );
}
