import { prisma } from "@/lib/prisma";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { z } from "zod";
import { withApiHandler, apiOk } from "@/lib/api-response";

export const runtime = "nodejs";

export const GET = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);

  const categories = await prisma.productCategory.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { name: "asc" },
  });

  return apiOk(
    categories.map((c) => ({
      id: c.id,
      name: c.name,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
  );
});

// Upsert kategori dari mobile (dibuat/diubah saat offline).
const categoryUpsertSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const POST = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);
  const body = await req.json().catch(() => null);
  const parsed = categoryUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, code: "VALIDATION_ERROR", message: "Data kategori tidak valid." },
      { status: 400 },
    );
  }
  const d = parsed.data;
  const existing = await prisma.productCategory.findFirst({
    where: { tenantId: ctx.tenantId, OR: [{ id: d.id }, { name: d.name }] },
    select: { id: true },
  });
  const category = existing
    ? await prisma.productCategory.update({
        where: { id: existing.id },
        data: { name: d.name },
      })
    : await prisma.productCategory.create({
        data: { tenantId: ctx.tenantId, id: d.id, name: d.name },
      });
  return apiOk({ id: category.id, name: category.name });
});