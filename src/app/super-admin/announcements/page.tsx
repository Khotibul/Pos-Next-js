import { requireSuperAdmin } from "@/lib/super-admin";
import { PageHeader } from "@/components/layout/page-header";
import { AnnouncementsTable } from "@/modules/super-admin/announcements/components/announcements-table";
import { listAnnouncements } from "@/modules/super-admin/announcements/service";

export default async function SuperAdminAnnouncementsPage() {
  await requireSuperAdmin();
  const items = await listAnnouncements();
  return (
    <div className="grid gap-6">
      <PageHeader title="Broadcast Pengumuman" description="Kirim pengumuman ke seluruh tenant." />
      <AnnouncementsTable
        items={items.map((a) => ({
          id: a.id,
          title: a.title,
          message: a.message,
          status: a.status,
          startsAt: a.startsAt ? a.startsAt.toISOString() : null,
          endsAt: a.endsAt ? a.endsAt.toISOString() : null,
          updatedAt: a.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}

