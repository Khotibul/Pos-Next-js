import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { withApiHandler, apiOk } from "@/lib/api-response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const variantCreateSchema = z.object({
  sku: z.string().trim().max(50).optional().or(z.literal("")),
  name: z.string().trim().min(1).max(200),
  barcode: z.string().trim().max(100).nullish(),
  qrCode: z.string().trim().max(200).nullish(),
  costPrice: z.number().min(0).default(0),
  sellingPrice: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
  stock: z.number().int().min(0).optional(),
  warehouseId: z.string().nullish(),
});

async function stockForVariants(tenantId: string, variantIds: string[]) {
  if (variantIds.length === 0) return new Map<string, number>();
  const rows = await prisma.productWarehouseStock.groupBy({
    by: ["variantId"],
    where: { tenantId, variantId: { in: variantIds } },
    _sum: { qty: true },
  });
  return new Map(rows.map((row) => [row.variantId ?? "", Number(row._sum?.qty ?? 0)]));
}

// GET /api/mobile/products/:id/variants
export const GET = withApiHandler(async (req: Request, ctx: Params) => {
  const auth = await getMobileContext(req);
  const { id } = await ctx.params;
  const product = await prisma.product.findFirst({ where: { id, tenantId: auth.tenantId }, select: { id: true } });
  if (!product) {
    return Response.json({ ok: false, code: "NOT_FOUND", message: "Produk tidak ditemukan." }, { status: 404 });
  }
  const variants = await prisma.productVariant.findMany({
    where: { tenantId: auth.tenantId, productId: id },
    orderBy: [{ name: "asc" }],
    select: { id: true, sku: true, name: true, barcode: true, qrCode: true, costPrice: true, sellingPrice: true, isActive: true },
  });
  const stock = await stockForVariants(auth.tenantId, variants.map((variant) => variant.id));
  return apiOk(
    variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      name: variant.name,
      barcode: variant.barcode,
      qrCode: variant.qrCode,
      costPrice: Number(variant.costPrice),
      sellingPrice: Number(variant.sellingPrice),
      isActive: variant.isActive,
      stock: stock.get(variant.id) ?? 0,
    })),
  );
});

// POST /api/mobile/products/:id/variants
export const POST = withApiHandler(async (req: Request, ctx: Params) => {
  const auth = await getMobileContext(req);
  const { id } = await ctx.params;
  const product = await prisma.product.findFirst({ where: { id, tenantId: auth.tenantId }, select: { id: true } });
  if (!product) {
    return Response.json({ ok: false, code: "NOT_FOUND", message: "Produk tidak ditemukan." }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const parsed = variantCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, code: "VALIDATION_ERROR", message: "Data varian tidak valid." }, { status: 400 });
  }
  const input = parsed.data;

  let warehouseId: string | null = null;
  if (input.stock !== undefined) {
    const warehouse = input.warehouseId
      ? await prisma.warehouse.findFirst({ where: { id: input.warehouseId, tenantId: auth.tenantId, isActive: true }, select: { id: true } })
      : await prisma.warehouse.findFirst({ where: { tenantId: auth.tenantId, isActive: true }, orderBy: { createdAt: "asc" }, select: { id: true } });
    warehouseId = warehouse?.id ?? null;
  }

  const created = await prisma.$transaction(async (tx) => {
    const sku = input.sku?.trim() ?? "";
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const variant = await tx.productVariant.create({
          data: {
            tenantId: auth.tenantId,
            productId: id,
            sku: sku || `VAR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
            name: input.name,
            barcode: input.barcode || null,
            qrCode: input.qrCode || null,
            costPrice: input.costPrice,
            sellingPrice: input.sellingPrice,
            isActive: input.isActive,
          },
          select: { id: true },
        });
        if (warehouseId && input.stock !== undefined) {
          await tx.productWarehouseStock.create({
            data: {
              tenantId: auth.tenantId,
              warehouseId,
              productId: id,
              variantId: variant.id,
              batchId: null,
              qty: input.stock,
            },
          });
        }
        return variant;
      } catch (error) {
        const err = error as { code?: string };
        if (err?.code === "P2002" && !sku && attempt < 2) continue;
        throw error;
      }
    }
    throw new Error("Gagal membuat SKU varian.");
  });

  return apiOk({ id: created.id });
});
