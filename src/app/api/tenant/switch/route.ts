import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import { apiMessage, withApiHandler } from "@/lib/api-response";

const schema = z.object({ tenantId: z.string().min(1) });

export const POST = withApiHandler(async (req: Request) => {
  const session = await auth();
  if (!session?.user?.id) throw Errors.unauthorized("Unauthorized");

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw Errors.badRequest("Invalid payload");

  const [user, tenant] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true, memberships: { select: { tenantId: true } } },
    }),
    prisma.tenant.findUnique({
      where: { id: parsed.data.tenantId },
      select: { id: true },
    }),
  ]);

  if (!user) throw Errors.unauthorized("Unauthorized");
  if (!tenant) throw Errors.notFound("Tenant not found");

  const allowed = user.isSuperAdmin || user.memberships.some((m) => m.tenantId === parsed.data.tenantId);
  if (!allowed) throw Errors.forbidden("Forbidden");

  const res = apiMessage("Tenant switched");
  res.cookies.set("active_tenant_id", parsed.data.tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res;
});