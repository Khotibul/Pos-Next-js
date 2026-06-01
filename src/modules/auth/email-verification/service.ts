import "server-only";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import { sendEmail } from "@/lib/email/smtp";
import { verifyEmailTemplate } from "@/lib/email/templates/verify-email";
import { enqueueJob } from "@/lib/queue";
import { invalidateEmailVerifiedCache } from "@/lib/cache/user-cache";

function appBaseUrl() {
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

function shouldQueueVerificationEmail() {
  return process.env.EMAIL_VERIFICATION_DELIVERY?.trim().toLowerCase() === "queue";
}

export async function createEmailVerificationToken(params: { userId: string; email: string; userName?: string | null }) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.emailVerificationToken.create({
    data: {
      userId: params.userId,
      email: params.email,
      token,
      expiresAt,
    },
  });

  const url = new URL("/verify-email", appBaseUrl());
  url.searchParams.set("token", token);

  const { html, text } = verifyEmailTemplate({
    appName: "POS Pro",
    verifyUrl: url.toString(),
    userName: params.userName ?? null,
  });

  const subject = "Verifikasi Email - POS Pro";

  if (shouldQueueVerificationEmail()) {
    const queued = await enqueueJob({ type: "EMAIL_VERIFICATION", to: params.email, subject, html, text });
    if (queued.queued) return { token, expiresAt };
  }

  await sendEmail({ to: params.email, subject, html, text });

  return { token, expiresAt };
}

export async function verifyEmailByToken(params: { token: string }) {
  const token = params.token.trim();
  if (!token) throw Errors.badRequest("Token tidak valid.");

  const row = await prisma.emailVerificationToken.findUnique({
    where: { token },
    select: { id: true, userId: true, email: true, expiresAt: true },
  });
  if (!row) throw Errors.badRequest("Token verifikasi tidak valid atau sudah digunakan.");
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.emailVerificationToken.delete({ where: { id: row.id } }).catch(() => {});
    throw Errors.badRequest("Token verifikasi sudah kedaluwarsa.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: row.userId },
      data: { emailVerified: new Date() },
    });
    await tx.emailVerificationToken.delete({ where: { id: row.id } });
  });

  await invalidateEmailVerifiedCache(row.userId);

  return { ok: true as const };
}

export async function resetEmailVerificationCache(userId: string) {
  await invalidateEmailVerifiedCache(userId);
}
