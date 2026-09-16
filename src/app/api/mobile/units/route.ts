import { prisma } from "@/lib/prisma";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { z } from "zod";
import { withApiHandler, apiOk } from "@/lib/api-response";

export const runtime = "nodejs";

export const GET = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);

  const units = await prisma.productUnit.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { name: "asc" },
    take: 5000,
  });

  return apiOk(
    units.map((u) => ({
      id: u.id,
      name: u.name,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    })),
  );
});

const unitUpsertSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const POST = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);
  const body = await req.json().catch(() => null);
  const parsed = unitUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, code: "VALIDATION_ERROR", message: "Data satuan tidak valid." },
      { status: 400 },
    );
  }
  const d = parsed.data;
  const existing = await prisma.productUnit.findFirst({
    where: { tenantId: ctx.tenantId, OR: [{ id: d.id }, { name: d.name }] },
    select: { id: true },
  });
  const unit = existing
    ? await prisma.productUnit.update({
        where: { id: existing.id },
        data: { name: d.name },
      })
    : await prisma.productUnit.create({
        data: { tenantId: ctx.tenantId, id: d.id, name: d.name },
      });
  return apiOk({ id: unit.id, name: unit.name });
});
