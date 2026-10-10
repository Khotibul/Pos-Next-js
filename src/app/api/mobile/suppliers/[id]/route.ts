import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { withApiHandler, apiOk } from "@/lib/api-response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const supplierUpdateSchema = z.object({
  name: z.string().min(1),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  address: z.string().nullish(),
  city: z.string().nullish(),
  contactPerson: z.string().nullish(),
  npwp: z.string().nullish(),
  isActive: z.boolean().default(true),
});

// PUT /api/mobile/suppliers/:id
export const PUT = withApiHandler(async (req: Request, ctx: Params) => {
  const auth = await getMobileContext(req);
  const { id } = await ctx.params;

  const existing = await prisma.supplier.findFirst({
    where: { id, tenantId: auth.tenantId },
    select: { id: true },
  });
  if (!existing) {
    return Response.json(
      { ok: false, code: "NOT_FOUND", message: "Pemasok tidak ditemukan." },
      { status: 404 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = supplierUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, code: "VALIDATION_ERROR", message: "Data pemasok tidak valid." },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const supplier = await prisma.supplier.update({
    where: { id: existing.id },
    data: {
      name: d.name,
      email: d.email ?? null,
      phone: d.phone ?? null,
      address: d.address ?? null,
      city: d.city ?? null,
      contactPerson: d.contactPerson ?? null,
      npwp: d.npwp ?? null,
      isActive: d.isActive,
    },
  });

  return apiOk({ id: supplier.id, name: supplier.name });
});

// DELETE /api/mobile/suppliers/:id
export const DELETE = withApiHandler(async (req: Request, ctx: Params) => {
  const auth = await getMobileContext(req);
  const { id } = await ctx.params;

  const existing = await prisma.supplier.findFirst({
    where: { id, tenantId: auth.tenantId },
    select: { id: true },
  });
  if (!existing) {
    return Response.json(
      { ok: false, code: "NOT_FOUND", message: "Pemasok tidak ditemukan." },
      { status: 404 },
    );
  }

  try {
    await prisma.supplier.delete({ where: { id } });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code === "P2003") {
      return Response.json(
        { ok: false, code: "IN_USE", message: "Pemasok masih dipakai produk/purchase." },
        { status: 400 },
      );
    }
    throw e;
  }

  return apiOk({ id, deleted: true });
});
