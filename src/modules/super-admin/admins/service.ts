import "server-only";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import type { UpsertAdminInput } from "@/modules/super-admin/admins/validators";

export async function listInternalAdmins() {
  return prisma.user.findMany({
    where: { isSuperAdmin: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, createdAt: true, updatedAt: true },
  });
}

export async function upsertInternalAdmin(input: UpsertAdminInput) {
  const email = input.email.toLowerCase().trim();
  const name = (input.name || "").trim() || null;
  const password = (input.password || "").trim() || null;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, isSuperAdmin: true, passwordHash: true },
  });

  if (existing) {
    const data: { isSuperAdmin: true; name?: string; passwordHash?: string } = { isSuperAdmin: true };
    if (name) data.name = name;
    if (password) data.passwordHash = await bcrypt.hash(password, 12);
    const updated = await prisma.user.update({ where: { id: existing.id }, data, select: { id: true } });
    return updated;
  }

  if (!password) throw Errors.badRequest("Password wajib untuk membuat admin baru.");
  const passwordHash = await bcrypt.hash(password, 12);

  const created = await prisma.user.create({
    data: { email, name, passwordHash, isSuperAdmin: true },
    select: { id: true },
  });
  return created;
}

export async function revokeInternalAdmin({ userId, currentUserId }: { userId: string; currentUserId: string }) {
  if (userId === currentUserId) throw Errors.badRequest("Tidak bisa mencabut akses Super Admin untuk akun sendiri.");

  const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, isSuperAdmin: true } });
  if (!exists) throw Errors.notFound("User tidak ditemukan.");
  if (!exists.isSuperAdmin) throw Errors.badRequest("User ini bukan Super Admin.");

  await prisma.user.update({ where: { id: userId }, data: { isSuperAdmin: false } });
  return { id: userId };
}
