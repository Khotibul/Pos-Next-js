import "server-only";

import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import { setCachedEmailVerified } from "@/lib/cache/user-cache";

export type GoogleMobileAuthResult = {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    image: string | null;
  };
  token: string;
  needsOnboarding: boolean;
};

function allowedAudiences() {
  return [
    process.env.GOOGLE_CLIENT_ID,
    process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    process.env.NEXT_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

function signMobileToken(payload: { userId: string; email: string | null }) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw Errors.badRequest("AUTH_SECRET belum dikonfigurasi.");

  const body = Buffer.from(
    JSON.stringify({
      sub: payload.userId,
      email: payload.email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    }),
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export async function authenticateMobileGoogleIdToken(idToken: string): Promise<GoogleMobileAuthResult> {
  const token = idToken.trim();
  if (!token) throw Errors.badRequest("GOOGLE_TOKEN_INVALID");

  const audiences = allowedAudiences();
  if (audiences.length === 0) throw Errors.badRequest("GOOGLE_CLIENT_ID belum dikonfigurasi.");

  const client = new OAuth2Client();
  const ticket = await client
    .verifyIdToken({
      idToken: token,
      audience: audiences,
    })
    .catch(() => null);

  const payload = ticket?.getPayload();
  if (!payload?.sub || !payload.email) throw Errors.badRequest("GOOGLE_TOKEN_INVALID");
  if (payload.email_verified !== true) throw Errors.badRequest("GOOGLE_EMAIL_NOT_VERIFIED");

  const email = payload.email.trim().toLowerCase();
  const providerAccountId = payload.sub;

  const existingAccount = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider: "google", providerAccountId } },
    select: { userId: true },
  });

  let user = existingAccount
    ? await prisma.user.findUnique({
        where: { id: existingAccount.userId },
        select: { id: true, email: true, name: true, image: true },
      })
    : await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true, email: true, name: true, image: true },
      });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: payload.name ?? email.split("@")[0],
        image: payload.picture ?? null,
        emailVerified: new Date(),
      },
      select: { id: true, email: true, name: true, image: true },
    });
  } else {
    await prisma.user
      .update({
        where: { id: user.id },
        data: {
          emailVerified: new Date(),
          image: user.image ?? payload.picture ?? null,
          name: user.name ?? payload.name ?? null,
        },
        select: { id: true },
      })
      .catch(() => null);
  }

  if (!existingAccount) {
    const linkedToOther = await prisma.account
      .findUnique({ where: { provider_providerAccountId: { provider: "google", providerAccountId } }, select: { userId: true } })
      .catch(() => null);
    if (linkedToOther && linkedToOther.userId !== user.id) throw Errors.badRequest("GOOGLE_ACCOUNT_IN_USE");

    if (!linkedToOther) {
      await prisma.account.create({
        data: {
          userId: user.id,
          type: "oidc",
          provider: "google",
          providerAccountId,
        },
      });
    }
  }

  await setCachedEmailVerified(user.id, true);
  const membershipCount = await prisma.tenantUser.count({ where: { userId: user.id } });

  return {
    user,
    token: signMobileToken({ userId: user.id, email: user.email }),
    needsOnboarding: membershipCount === 0,
  };
}
