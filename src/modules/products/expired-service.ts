import "server-only";

import { prisma } from "@/lib/prisma";

export type ExpiredBatchItem = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string | null;
  batchNumber: string | null;
  expiredDate: string;
  daysToExpire: number;
  quantity: number;
  branchId: string | null;
};

export async function listExpiredBatches(params: {
  tenantId: string;
  branchId: string;
  window: "expired" | "7" | "30" | "90";
  q?: string | null;
  page?: number;
  pageSize?: number;
}) {
  const now = new Date();
  const end = new Date(now);
  if (params.window === "7") end.setDate(end.getDate() + 7);
  if (params.window === "30") end.setDate(end.getDate() + 30);
  if (params.window === "90") end.setDate(end.getDate() + 90);

  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(50, Math.max(5, Math.floor(params.pageSize ?? 20)));
  const skip = (page - 1) * pageSize;
  const q = params.q?.trim() ? params.q.trim() : null;

  const expiredWhere =
    params.window === "expired"
      ? { lt: now }
      : {
          gte: now,
          lte: end,
        };

  const where = {
    tenantId: params.tenantId,
    branchId: params.branchId,
    expiredDate: { not: null, ...expiredWhere },
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
  };

  const [total, items] = await prisma.$transaction([
    prisma.productBatch.count({ where }),
    prisma.productBatch.findMany({
      where,
      orderBy: { expiredDate: "asc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        productId: true,
        branchId: true,
        batchNumber: true,
        expiredDate: true,
        quantity: true,
        product: { select: { name: true, sku: true, barcode: true } },
      },
    }),
  ]);

  const mapped: ExpiredBatchItem[] = items
    .filter((b) => b.expiredDate)
    .map((b) => {
      const exp = b.expiredDate as Date;
      const daysToExpire = Math.ceil((exp.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      return {
        id: b.id,
        productId: b.productId,
        productName: b.product.name,
        sku: b.product.sku,
        barcode: b.product.barcode ?? null,
        batchNumber: b.batchNumber ?? null,
        expiredDate: exp.toISOString(),
        daysToExpire,
        quantity: Number(b.quantity),
        branchId: b.branchId ?? null,
      };
    });

  return { q, page, pageSize, total, items: mapped };
}

