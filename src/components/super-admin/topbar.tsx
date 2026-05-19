import { Search } from "lucide-react";
import { SuperAdminUserMenu } from "@/components/super-admin/user-menu";

export function SuperAdminTopbar({
  user,
}: {
  user: { name: string | null; email: string | null; image?: string | null };
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="font-semibold">Super Admin SaaS</div>
      </div>

      <div className="hidden flex-1 px-4 md:block">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-11 w-full rounded-full border bg-background px-10 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Cari tenant, user, atau invoice..."
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <SuperAdminUserMenu name={user.name} email={user.email} image={user.image ?? null} />
      </div>
    </header>
  );
}

