import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Building2, Mail, Printer, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const ctx = await requirePermission(PERMISSIONS.settings_read);
  return (
    <div className="grid gap-4">
      <PageHeader title="Pengaturan" description="Profil bisnis, pajak, printer, notifikasi." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-2xl">
          <CardHeader className="py-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Building2 className="h-4 w-4" />
              </span>
              Profil Bisnis
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div className="font-medium">{ctx.tenantName}</div>
            <div className="text-muted-foreground">Pengaturan profil bisnis per-tenant.</div>
            <div>
              <Badge variant={ctx.tenantStatus === "ACTIVE" ? "default" : ctx.tenantStatus === "TRIAL" ? "secondary" : "destructive"}>
                {ctx.tenantStatus}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="py-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Printer className="h-4 w-4" />
              </span>
              Struk & Printer
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground">
            <div>Template struk dan pengaturan thermal printer.</div>
            <div>
              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <Link href="/settings/printer">Buka Pengaturan</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="py-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Mail className="h-4 w-4" />
              </span>
              Notifikasi
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Email/WA gateway & reminder.</CardContent>
        </Card>

        <Card className="rounded-2xl sm:col-span-2 lg:col-span-3">
          <CardHeader className="py-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Shield className="h-4 w-4" />
              </span>
              Keamanan
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            RBAC, session management, audit log, dan proteksi tenant isolation.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
