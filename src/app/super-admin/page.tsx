import { SiteHeader } from "@/components/layout/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { requireSuperAdmin } from "@/lib/super-admin";

export default async function SuperAdminPage() {
  await requireSuperAdmin();
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-grid" />
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Super Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manajemen tenant, paket, invoice, pembayaran, dan audit log.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Tenants", desc: "Aktivasi/nonaktif, trial, domain/subdomain." },
            { title: "Plans & Pricing", desc: "Paket, trial days, dan harga per bulan.", href: "/super-admin/plans" },
            { title: "Audit & Logs", desc: "Activity log, audit trail, dan pengaturan global." },
          ].map((c) => (
            <Card key={c.title} className="transition-colors hover:bg-muted/20">
              <CardHeader className="py-4">
                <CardTitle className="text-base">{c.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {c.href ? (
                  <Link href={c.href} className="block rounded-lg border bg-background p-3 hover:bg-muted/30">
                    <div className="font-medium">Buka</div>
                    <div className="mt-1 text-xs text-muted-foreground">{c.desc}</div>
                  </Link>
                ) : (
                  c.desc
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
