import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { withApiHandler, apiOk } from "@/lib/api-response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const customerUpdateSchema = z.object({
  name: z.string().min(1),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  address: z.string().nullish(),
  city: z.string().nullish(),
  totalPurchase: z.number().default(0),
  purchaseCount: z.number().int().default(0),
  points: z.number().default(0),
  isWholesale: z.boolean().default(false),
  customerType: z.string().default("RETAIL"),
  isActive: z.boolean().default(true),
});

// PUT /api/mobile/customers/:id
export const PUT = withApiHandler(async (req: Request, ctx: Params) => {
  const auth = await getMobileContext(req);
  const { id } = await ctx.params;

  const existing = await prisma.customer.findFirst({
    where: { id, tenantId: auth.tenantId },
    select: { id: true },
  });
  if (!existing) {
    return Response.json(
      { ok: false, code: "NOT_FOUND", message: "Pelanggan tidak ditemukan." },
      { status: 404 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = customerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, code: "VALIDATION_ERROR", message: "Data pelanggan tidak valid." },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const customer = await prisma.customer.update({
    where: { id: existing.id },
    data: {
      name: d.name,
      email: d.email ?? null,
      phone: d.phone ?? null,
      address: d.address ?? null,
      city: d.city ?? null,
      totalPurchase: d.totalPurchase,
      purchaseCount: d.purchaseCount,
      points: d.points,
      isWholesale: d.isWholesale,
      customerType: d.customerType,
      isActive: d.isActive,
    },
  });

  return apiOk({ id: customer.id, name: customer.name });
});

// DELETE /api/mobile/customers/:id
export const DELETE = withApiHandler(async (req: Request, ctx: Params) => {
  const auth = await getMobileContext(req);
  const { id } = await ctx.params;

  const existing = await prisma.customer.findFirst({
    where: { id, tenantId: auth.tenantId },
    select: { id: true },
  });
  if (!existing) {
    return Response.json(
      { ok: false, code: "NOT_FOUND", message: "Pelanggan tidak ditemukan." },
      { status: 404 },
    );
  }

  try {
    await prisma.customer.delete({ where: { id } });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code === "P2003") {
      return Response.json(
        { ok: false, code: "IN_USE", message: "Pelanggan masih dipakai di transaksi." },
        { status: 400 },
      );
    }
    throw e;
  }

  return apiOk({ id, deleted: true });
});
