import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withApiHandler, apiOk } from "@/lib/api-response";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createEmailVerificationToken } from "@/modules/auth/email-verification/service";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
});

export const POST = withApiHandler(async (req: Request) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Email tidak valid." }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  const limit = await checkRateLimit("resendVerification", `${getClientIp(req)}:${email}`);
  if (!limit.success) {
    return NextResponse.json({ message: "Terlalu banyak permintaan verifikasi. Coba lagi nanti." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, emailVerified: true },
  });

  if (!user) return apiOk({ ok: true });
  if (user.emailVerified) return apiOk({ ok: true });

  await createEmailVerificationToken({
    userId: user.id,
    email: user.email ?? email,
    userName: user.name ?? null,
  });

  return apiOk({ ok: true });
});
