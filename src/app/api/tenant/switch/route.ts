import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ tenantId: z.string().min(1) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ message: "Invalid payload" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSuperAdmin: true, memberships: { select: { tenantId: true } } },
  });

  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const allowed = user.isSuperAdmin || user.memberships.some((m) => m.tenantId === parsed.data.tenantId);
  if (!allowed) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: parsed.data.tenantId },
    select: { id: true },
  });
  if (!tenant) return NextResponse.json({ message: "Tenant not found" }, { status: 404 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("active_tenant_id", parsed.data.tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res;
}
