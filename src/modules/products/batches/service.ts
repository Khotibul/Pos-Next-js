import "server-only";

import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import type { UpsertProductBatchInput } from "@/modules/products/batches/validators";

export type ProductBatchListItem = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string | null;
  batchNumber: string | null;
  expiredDate: string | null;
  quantity: number;
  costPrice: number;
  source: string | null;
  ocrText: string | null;
  confidence: number | null;
  createdAt: string;
  updatedAt: string;
};

export async function listProductBatches(params: {
  tenantId: string;
  branchId: string;
  q?: string | null;
  window?: "expired" | "7" | "30" | "90" | null;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(50, Math.max(5, Math.floor(params.pageSize ?? 20)));
  const skip = (page - 1) * pageSize;
  const q = params.q?.trim() ? params.q.trim() : null;

  const now = new Date();
  const end = new Date(now);
  if (params.window === "7") end.setDate(end.getDate() + 7);
  if (params.window === "30") end.setDate(end.getDate() + 30);
  if (params.window === "90") end.setDate(end.getDate() + 90);

  const expiredWhere =
    params.window === "expired"
      ? { expiredDate: { lt: now } }
      : params.window === "7" || params.window === "30" || params.window === "90"
        ? { expiredDate: { gte: now, lte: end } }
        : {};

  const where = {
    tenantId: params.tenantId,
    branchId: params.branchId,
    ...(q
      ? {
          OR: [
            { batchNumber: { contains: q, mode: "insensitive" as const } },
            { product: { name: { contains: q, mode: "insensitive" as const } } },
            { product: { sku: { contains: q, mode: "insensitive" as const } } },
            { product: { barcode: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
    ...expiredWhere,
  };

  const [total, items] = await prisma.$transaction([
    prisma.productBatch.count({ where }),
    prisma.productBatch.findMany({
      where,
      orderBy: [{ expiredDate: "asc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
      select: {
        id: true,
        productId: true,
        batchNumber: true,
        expiredDate: true,
        quantity: true,
        costPrice: true,
        source: true,
        ocrText: true,
        confidence: true,
        createdAt: true,
        updatedAt: true,
        product: { select: { name: true, sku: true, barcode: true } },
      },
    }),
  ]);

  const mapped: ProductBatchListItem[] = items.map((b) => ({
    id: b.id,
    productId: b.productId,
    productName: b.product.name,
    sku: b.product.sku,
    barcode: b.product.barcode ?? null,
    batchNumber: b.batchNumber ?? null,
    expiredDate: b.expiredDate ? b.expiredDate.toISOString() : null,
    quantity: Number(b.quantity),
    costPrice: Number(b.costPrice),
    source: b.source ?? null,
    ocrText: b.ocrText ?? null,
    confidence: b.confidence == null ? null : Number(b.confidence),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }));

  return { q, page, pageSize, total, items: mapped };
}

export async function upsertProductBatch(params: { tenantId: string; branchId: string; input: UpsertProductBatchInput }) {
  const { input } = params;
  if (!input.productId) throw Errors.badRequest("Produk wajib dipilih.");

  if (input.id) {
    const existing = await prisma.productBatch.findFirst({
      where: { id: input.id, tenantId: params.tenantId, branchId: params.branchId },
      select: { id: true },
    });
    if (!existing) throw Errors.notFound("Batch tidak ditemukan.");

    const updated = await prisma.productBatch.update({
      where: { id: existing.id },
      data: {
        batchNumber: input.batchNumber,
        expiredDate: input.expiredDate,
        quantity: input.quantity,
        costPrice: input.costPrice,
        source: input.source,
        photoUrl: input.photoUrl,
        ocrText: input.ocrText,
        confidence: typeof input.confidence === "number" ? input.confidence : undefined,
      },
      select: { id: true },
    });
    return updated;
  }

  const created = await prisma.productBatch.create({
    data: {
      tenantId: params.tenantId,
      branchId: params.branchId,
      productId: input.productId,
      batchNumber: input.batchNumber,
      expiredDate: input.expiredDate,
      quantity: input.quantity,
      costPrice: input.costPrice,
      source: input.source,
      photoUrl: input.photoUrl,
      ocrText: input.ocrText,
      confidence: typeof input.confidence === "number" ? input.confidence : null,
    },
    select: { id: true },
  });
  return created;
}

export async function deleteProductBatch(params: { tenantId: string; branchId: string; id: string }) {
  const existing = await prisma.productBatch.findFirst({
    where: { id: params.id, tenantId: params.tenantId, branchId: params.branchId },
    select: { id: true },
  });
  if (!existing) throw Errors.notFound("Batch tidak ditemukan.");
  await prisma.productBatch.delete({ where: { id: existing.id } });
  return { id: existing.id };
}
