import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { withApiHandler, apiOk } from "@/lib/api-response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; variantId: string }> };

const variantUpdateSchema = z.object({
  sku: z.string().trim().min(1).max(50).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  barcode: z.string().trim().max(100).nullish(),
  qrCode: z.string().trim().max(200).nullish(),
  costPrice: z.number().min(0).optional(),
  sellingPrice: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  stock: z.number().int().min(0).optional(),
  warehouseId: z.string().nullish(),
});

export const PUT = withApiHandler(async (req: Request, ctx: Params) => {
  const auth = await getMobileContext(req);
  const { id, variantId } = await ctx.params;
  const existing = await prisma.productVariant.findFirst({
    where: { id: variantId, productId: id, tenantId: auth.tenantId },
    select: { id: true },
  });
  if (!existing) {
    return Response.json({ ok: false, code: "NOT_FOUND", message: "Varian tidak ditemukan." }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const parsed = variantUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, code: "VALIDATION_ERROR", message: "Data varian tidak valid." }, { status: 400 });
  }
  const input = parsed.data;

  const warehouse = input.stock !== undefined
    ? input.warehouseId
      ? await prisma.warehouse.findFirst({ where: { id: input.warehouseId, tenantId: auth.tenantId, isActive: true }, select: { id: true } })
      : await prisma.warehouse.findFirst({ where: { tenantId: auth.tenantId, isActive: true }, orderBy: { createdAt: "asc" }, select: { id: true } })
    : null;

  await prisma.$transaction(async (tx) => {
    await tx.productVariant.update({
      where: { id: existing.id },
      data: {
        sku: input.sku,
        name: input.name,
        barcode: input.barcode === "" ? null : input.barcode,
        qrCode: input.qrCode === "" ? null : input.qrCode,
        costPrice: input.costPrice,
        sellingPrice: input.sellingPrice,
        isActive: input.isActive,
      },
    });

    if (warehouse && input.stock !== undefined) {
      const stockRow = await tx.productWarehouseStock.findFirst({
        where: {
          tenantId: auth.tenantId,
          warehouseId: warehouse.id,
          productId: id,
          variantId: existing.id,
          batchId: null,
        },
        select: { id: true },
      });
      if (stockRow) {
        await tx.productWarehouseStock.update({ where: { id: stockRow.id }, data: { qty: input.stock } });
      } else {
        await tx.productWarehouseStock.create({
          data: {
            tenantId: auth.tenantId,
            warehouseId: warehouse.id,
            productId: id,
            variantId: existing.id,
            batchId: null,
            qty: input.stock,
          },
        });
      }
    }
  });

  return apiOk({ id: existing.id });
});

export const DELETE = withApiHandler(async (req: Request, ctx: Params) => {
  const auth = await getMobileContext(req);
  const { id, variantId } = await ctx.params;
  const existing = await prisma.productVariant.findFirst({
    where: { id: variantId, productId: id, tenantId: auth.tenantId },
    select: { id: true },
  });
  if (!existing) {
    return Response.json({ ok: false, code: "NOT_FOUND", message: "Varian tidak ditemukan." }, { status: 404 });
  }
  try {
    await prisma.productVariant.delete({ where: { id: existing.id } });
  } catch (error) {
    const err = error as { code?: string };
    if (err?.code === "P2003") {
      return Response.json({ ok: false, code: "IN_USE", message: "Varian sudah dipakai transaksi. Nonaktifkan saja." }, { status: 400 });
    }
    throw error;
  }
  return apiOk({ id: existing.id, deleted: true });
});
