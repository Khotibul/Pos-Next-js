import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, History, DoorOpen } from "lucide-react";
import { getOpenShift } from "@/modules/shifts/service";

export default async function CashierDashboardPage() {
  const ctx = await requirePermission(PERMISSIONS.sales_read);
  const openShift = await getOpenShift({ tenantId: ctx.tenantId, branchId: ctx.branchId, cashierId: ctx.userId });

  return (
    <div className="grid gap-4">
      <PageHeader title="Dashboard Kasir" description="Akses cepat transaksi & shift." />

      {!openShift ? (
        <Card className="rounded-2xl border-orange-500/30 bg-orange-500/5">
          <CardContent className="py-4 text-sm">
            <div className="font-medium">Shift belum dibuka</div>
            <div className="mt-1 text-muted-foreground">Buka shift sebelum mulai transaksi.</div>
            <Button asChild className="mt-3 rounded-xl">
              <Link href="/shifts">
                <DoorOpen className="mr-2 h-4 w-4" />
                Buka Shift
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-2xl">
          <CardHeader className="py-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary">
                <ShoppingCart className="h-4 w-4" />
              </span>
              POS Screen
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Mulai transaksi baru di POS.
            <div className="mt-3">
              <Button asChild className="rounded-xl">
                <Link href="/pos">New Transaction</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="py-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary">
                <History className="h-4 w-4" />
              </span>
              Riwayat Penjualan
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Lihat transaksi terbaru.
            <div className="mt-3">
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/sales">Buka Riwayat</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
