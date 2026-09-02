import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { withApiHandler, apiOk } from "@/lib/api-response";
import { requireCanUseDatabase } from "@/lib/plan-guard";

export const runtime = "nodejs";

const purchaseUpsertSchema = z.object({
  id: z.string().min(1),
  orderNo: z.string().min(1),
  supplierId: z.string().nullish(),
  status: z.string().default("DRAFT"),
  subtotal: z.number().default(0),
  tax: z.number().default(0),
  total: z.number().default(0),
  notes: z.string().nullish(),
  createdAt: z.string().nullish(),
  items: z.array(z.object({
    productId: z.string().min(1),
    qty: z.number(),
    price: z.number(),
  })).default([]),
});

export const POST = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);
  try {
    await requireCanUseDatabase(ctx.tenantId);
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.message === "PLAN_FREE_NO_DB") {
      return Response.json({ ok: false, code: "PLAN_FREE_NO_DB", message: "Paket Free tidak bisa simpan purchase ke database. Upgrade ke Pro/Enterprise." }, { status: 403 });
    }
    throw e;
  }
  const body = await req.json().catch(() => null);
  const parsed = purchaseUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, code: "VALIDATION_ERROR", message: "Data purchase tidak valid." }, { status: 400 });
  }
  const d = parsed.data;

  let supplierId: string | null = null;
  if (d.supplierId) {
    const sup = await prisma.supplier.findFirst({ where: { id: d.supplierId, tenantId: ctx.tenantId }, select: { id: true } });
    supplierId = sup?.id ?? null;
  }

  const existing = await prisma.purchaseOrder.findFirst({
    where: { tenantId: ctx.tenantId, OR: [{ id: d.id }, { orderNo: d.orderNo }] },
    select: { id: true },
  });

  const data = {
    orderNo: d.orderNo,
    supplierId,
    status: d.status as never,
    notes: d.notes ?? null,
    subtotal: d.subtotal,
    tax: d.tax,
    total: d.total,
  };

  const purchase = existing
    ? await prisma.purchaseOrder.update({ where: { id: existing.id }, data })
    : await prisma.purchaseOrder.create({ data: { tenantId: ctx.tenantId, id: d.id, ...data } });

  // Upsert items (hapus lalu buat ulang untuk sync sederhana)
  if (d.items.length > 0) {
    await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: purchase.id, tenantId: ctx.tenantId } });
    for (const it of d.items) {
      const prod = await prisma.product.findFirst({ where: { id: it.productId, tenantId: ctx.tenantId }, select: { id: true, name: true, sku: true } });
      if (!prod) continue;
      await prisma.purchaseOrderItem.create({
        data: {
          tenantId: ctx.tenantId,
          purchaseOrderId: purchase.id,
          productId: prod.id,
          name: prod.name,
          sku: prod.sku,
          costPrice: it.price,
          qty: Math.round(it.qty),
          lineTotal: it.qty * it.price,
        },
      });
    }
  }

  return apiOk({ id: purchase.id, orderNo: purchase.orderNo });
});

export const GET = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "100"), 200);
  const orders = await prisma.purchaseOrder.findMany({
    where: { tenantId: ctx.tenantId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return apiOk(orders);
});
