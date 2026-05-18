import { getTenantContext } from "@/lib/tenant-context";
import { redirect } from "next/navigation";
import { SidebarShell } from "@/components/layout/sidebar-shell";
import { Topbar } from "@/components/layout/topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-grid" />
      <div className="flex">
        <SidebarShell permissions={ctx.permissions} isSuperAdmin={ctx.isSuperAdmin} />
        <div className="flex min-h-screen flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-6 py-6">
            {ctx.tenantStatus === "SUSPENDED" || ctx.tenantStatus === "EXPIRED" ? (
              <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                <div className="font-medium">Akses dibatasi</div>
                <div className="text-muted-foreground">
                  Status tenant: <span className="font-mono">{ctx.tenantStatus}</span>. Aksi tulis/transaksi akan
                  ditolak sampai billing dibereskan.
                </div>
              </div>
            ) : null}
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
