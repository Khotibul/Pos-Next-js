import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/auth/mobile-token";
import { withApiHandler } from "@/lib/api-response";

export const runtime = "nodejs";

// GET /api/auth/me — profil user dari token mobile (dipakai fallback saat cache kosong)
export const GET = withApiHandler(async (req: Request) => {
  const auth = verifyMobileToken(req);

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      isSuperAdmin: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return Response.json(
      { ok: false, code: "NOT_FOUND", message: "User tidak ditemukan." },
      { status: 404 },
    );
  }

  // Bentuk datar: Android membaca response.data['user'] dan default role 'USER'
  return Response.json(
    {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.isSuperAdmin ? "ADMIN" : "USER",
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
});
