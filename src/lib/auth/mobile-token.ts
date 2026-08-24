import "server-only";

import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";

export type MobileAuthContext = {
  userId: string;
  email: string | null;
  tenantId: string;
};

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function verifyMobileToken(req: Request): { userId: string; email: string | null } {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw Errors.badRequest("AUTH_SECRET belum dikonfigurasi.");

  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw Errors.unauthorized("Token tidak ditemukan.");

  const [body, sig] = token.split(".");
  if (!body || !sig) throw Errors.unauthorized("Token tidak valid.");

  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  if (!safeEqual(sig, expected)) throw Errors.unauthorized("Token tidak valid.");

  let payload: { sub?: string; email?: string | null; exp?: number };
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    throw Errors.unauthorized("Token tidak valid.");
  }

  if (!payload.sub) throw Errors.unauthorized("Token tidak valid.");
  if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
    throw Errors.unauthorized("Token kedaluwarsa.");
  }

  return { userId: payload.sub, email: payload.email ?? null };
}

export async function getMobileContext(req: Request): Promise<MobileAuthContext> {
  const auth = verifyMobileToken(req);

  const membership = await prisma.tenantUser.findFirst({
    where: { userId: auth.userId },
    select: { tenantId: true },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) {
    throw Errors.forbidden("Akun ini belum terhubung ke tenant manapun.");
  }

  return { userId: auth.userId, email: auth.email, tenantId: membership.tenantId };
}
