import { requireSuperAdmin } from "@/lib/super-admin";
import { SuperAdminSidebar } from "@/components/super-admin/sidebar";
import { SuperAdminTopbar } from "@/components/super-admin/topbar";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSuperAdmin();
  return (
    <div className="min-h-screen bg-app">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-grid" />
      <div className="flex">
        <SuperAdminSidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <SuperAdminTopbar user={{ name: user.name ?? null, email: user.email ?? null, image: null }} />
          <main className="flex-1 px-6 py-6">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
