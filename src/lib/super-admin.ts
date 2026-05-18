import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";

export async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, email: true, name: true, isSuperAdmin: true } });
  if (!user) throw Errors.unauthorized("User tidak ditemukan.");
  if (!user.isSuperAdmin) throw Errors.forbidden("Akses ditolak. Hanya Super Admin.");
  return user;
}

