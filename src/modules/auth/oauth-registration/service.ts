import "server-only";

import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import type { CreateOauthRegistrationInput } from "@/modules/auth/oauth-registration/validators";

export async function createOauthRegistration(input: CreateOauthRegistrationInput) {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const row = await prisma.oauthRegistration.create({
    data: {
      tenantName: input.tenantName,
      ownerName: input.ownerName,
      phone: input.phone ?? null,
      planSlug: input.planSlug ?? null,
      expiresAt,
    },
    select: { id: true, expiresAt: true },
  });
  return row;
}

export async function consumeOauthRegistration(params: { id: string }) {
  const row = await prisma.oauthRegistration.findUnique({
    where: { id: params.id },
    select: { id: true, tenantName: true, ownerName: true, phone: true, planSlug: true, expiresAt: true },
  });
  if (!row) throw Errors.badRequest("Registrasi Google tidak valid.");
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.oauthRegistration.delete({ where: { id: row.id } }).catch(() => {});
    throw Errors.badRequest("Registrasi Google sudah kedaluwarsa. Silakan ulangi.");
  }

  await prisma.oauthRegistration.delete({ where: { id: row.id } }).catch(() => {});
  return row;
}

