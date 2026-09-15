import { prisma } from "@/lib/prisma";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { z } from "zod";
import { withApiHandler, apiOk } from "@/lib/api-response";

export const runtime = "nodejs";

export const GET = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);

  const brands = await prisma.productBrand.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { name: "asc" },
  });

  return apiOk(
    brands.map((b) => ({
      id: b.id,
      name: b.name,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    })),
  );
});

const brandUpsertSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const POST = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);
  const body = await req.json().catch(() => null);
  const parsed = brandUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, code: "VALIDATION_ERROR", message: "Data merek tidak valid." },
      { status: 400 },
    );
  }
  const d = parsed.data;
  const existing = await prisma.productBrand.findFirst({
    where: { tenantId: ctx.tenantId, OR: [{ id: d.id }, { name: d.name }] },
    select: { id: true },
  });
  const brand = existing
    ? await prisma.productBrand.update({
        where: { id: existing.id },
        data: { name: d.name },
      })
    : await prisma.productBrand.create({
        data: { tenantId: ctx.tenantId, id: d.id, name: d.name },
      });
  return apiOk({ id: brand.id, name: brand.name });
});
