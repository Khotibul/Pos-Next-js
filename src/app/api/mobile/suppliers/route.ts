import { prisma } from "@/lib/prisma";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { z } from "zod";
import { withApiHandler, apiOk } from "@/lib/api-response";

export const runtime = "nodejs";

export const GET = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);

  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.trim();

  const suppliers = await prisma.supplier.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }] } : {}),
    },
    orderBy: { name: "asc" },
  });

  return apiOk(
    suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      address: s.address,
      isActive: s.isActive,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
  );
});

// Upsert pemasok dari mobile (dibuat/diubah saat offline).
const supplierUpsertSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  address: z.string().nullish(),
  isActive: z.boolean().default(true),
});

export const POST = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);
  const body = await req.json().catch(() => null);
  const parsed = supplierUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, code: "VALIDATION_ERROR", message: "Data pemasok tidak valid." },
      { status: 400 },
    );
  }
  const d = parsed.data;
  const data = {
    name: d.name,
    email: d.email ?? null,
    phone: d.phone ?? null,
    address: d.address ?? null,
    isActive: d.isActive,
  };
  const existing = await prisma.supplier.findFirst({
    where: { tenantId: ctx.tenantId, id: d.id },
    select: { id: true },
  });
  const supplier = existing
    ? await prisma.supplier.update({ where: { id: existing.id }, data })
    : await prisma.supplier.create({
        data: { tenantId: ctx.tenantId, id: d.id, ...data },
      });
  return apiOk({ id: supplier.id, name: supplier.name });
});