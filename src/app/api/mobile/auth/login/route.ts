import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signMobileToken } from "@/lib/auth/google-mobile";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
});

const errorMap: Record<string, string> = {
  INVALID_CREDENTIALS: "Email atau password salah.",
  USER_INACTIVE: "Akun ini tidak aktif.",
  ACCOUNT_NOT_FOUND: "Email tidak ditemukan.",
};

export async function POST(req: Request) {
  const limit = await checkRateLimit("login", `mobile-email:${getClientIp(req)}`);
  if (!limit.success) {
    return NextResponse.json({ ok: false, code: "RATE_LIMITED", message: "Terlalu banyak percobaan login." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "INVALID_CREDENTIALS", message: "Email atau password tidak valid." },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, code: "ACCOUNT_NOT_FOUND", message: errorMap.ACCOUNT_NOT_FOUND },
        { status: 401 },
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { ok: false, code: "USER_INACTIVE", message: errorMap.USER_INACTIVE },
        { status: 403 },
      );
    }

    const passwordValid = user.passwordHash
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

    if (!passwordValid) {
      return NextResponse.json(
        { ok: false, code: "INVALID_CREDENTIALS", message: errorMap.INVALID_CREDENTIALS },
        { status: 401 },
      );
    }

    const membershipCount = await prisma.tenantUser.count({ where: { userId: user.id } });

    return NextResponse.json(
      {
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        },
        token: signMobileToken({ userId: user.id, email: user.email }),
        needsOnboarding: membershipCount === 0,
      },
      { status: 200 },
    );
  } catch (error) {
    const code = error instanceof Error && error.message ? error.message : "LOGIN_FAILED";
    return NextResponse.json(
      { ok: false, code, message: "Login gagal. Silakan coba lagi." },
      { status: 500 },
    );
  }
}
