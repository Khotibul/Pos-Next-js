import "server-only";

import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import type { UpsertAnnouncementInput } from "@/modules/super-admin/announcements/validators";

function parseDateOrNull(value?: string) {
  const v = (value || "").trim();
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function listAnnouncements() {
  return prisma.announcement.findMany({
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function upsertAnnouncement(input: UpsertAnnouncementInput) {
  const startsAt = parseDateOrNull(input.startsAt);
  const endsAt = parseDateOrNull(input.endsAt);
  if (startsAt && endsAt && endsAt < startsAt) throw Errors.badRequest("EndsAt harus setelah StartsAt.");

  if (input.id) {
    const exists = await prisma.announcement.findUnique({ where: { id: input.id }, select: { id: true } });
    if (!exists) throw Errors.notFound("Pengumuman tidak ditemukan.");
    return prisma.announcement.update({
      where: { id: input.id },
      data: { title: input.title, message: input.message, status: input.status, startsAt, endsAt },
      select: { id: true },
    });
  }
  return prisma.announcement.create({
    data: { title: input.title, message: input.message, status: input.status, startsAt, endsAt },
    select: { id: true },
  });
}

export async function deleteAnnouncement(id: string) {
  const exists = await prisma.announcement.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw Errors.notFound("Pengumuman tidak ditemukan.");
  await prisma.announcement.delete({ where: { id } });
  return { id };
}

