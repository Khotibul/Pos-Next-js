import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { withApiHandler, apiOk } from "@/lib/api-response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const categoryUpdateSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullish(),
  icon: z.string().nullish(),
  color: z.string().nullish(),
  isActive: z.boolean().default(true),
  productCount: z.number().int().default(0),
});

// PUT /api/mobile/categories/:id — update kategori milik tenant
export const PUT = withApiHandler(async (req: Request, ctx: Params) => {
  const auth = await getMobileContext(req);
  const { id } = await ctx.params;

  const existing = await prisma.productCategory.findFirst({
    where: { id, tenantId: auth.tenantId },
    select: { id: true },
  });
  if (!existing) {
    return Response.json(
      { ok: false, code: "NOT_FOUND", message: "Kategori tidak ditemukan." },
      { status: 404 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = categoryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, code: "VALIDATION_ERROR", message: "Data kategori tidak valid." },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const category = await prisma.productCategory.update({
    where: { id: existing.id },
    data: {
      name: d.name,
      description: d.description ?? null,
      icon: d.icon ?? null,
      color: d.color ?? null,
      isActive: d.isActive,
      productCount: d.productCount,
    },
  });

  return apiOk({ id: category.id, name: category.name });
});

// DELETE /api/mobile/categories/:id
export const DELETE = withApiHandler(async (req: Request, ctx: Params) => {
  const auth = await getMobileContext(req);
  const { id } = await ctx.params;

  const existing = await prisma.productCategory.findFirst({
    where: { id, tenantId: auth.tenantId },
    select: { id: true },
  });
  if (!existing) {
    return Response.json(
      { ok: false, code: "NOT_FOUND", message: "Kategori tidak ditemukan." },
      { status: 404 },
    );
  }

  try {
    await prisma.productCategory.delete({ where: { id } });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code === "P2003") {
      return Response.json(
        { ok: false, code: "IN_USE", message: "Kategori masih dipakai produk." },
        { status: 400 },
      );
    }
    throw e;
  }

  return apiOk({ id, deleted: true });
});
