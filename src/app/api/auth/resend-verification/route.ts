import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createEmailVerificationToken } from "@/modules/auth/email-verification/service";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Email tidak valid." }, { status: 400 });

  const email = parsed.data.email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, emailVerified: true },
  });

  // Prevent user enumeration: always return ok=true for unknown email.
  if (!user) return NextResponse.json({ ok: true }, { status: 200 });
  if (user.emailVerified) return NextResponse.json({ ok: true }, { status: 200 });

  try {
    await createEmailVerificationToken({
      userId: user.id,
      email: user.email ?? email,
      userName: user.name ?? null,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Gagal mengirim email verifikasi.";
    return NextResponse.json({ message: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
