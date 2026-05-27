import "server-only";

import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import type { UpsertProductDiscountInput } from "@/modules/products/discounts/validators";

export type ProductDiscountListItem = {
  id: string;
  branchId: string | null;
  branchName: string | null;
  type: string;
  value: number;
  buyQty: number | null;
  getQty: number | null;
  productId: string | null;
  productName: string | null;
  sku: string | null;
  bundleId: string | null;
  bundleName: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  updatedAt: string;
};

export async function listProductDiscounts(params: { tenantId: string; q?: string | null; page?: number; pageSize?: number }) {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(50, Math.max(5, Math.floor(params.pageSize ?? 20)));
  const skip = (page - 1) * pageSize;
  const q = params.q?.trim() ? params.q.trim() : null;

  const where = {
    tenantId: params.tenantId,
    ...(q
      ? {
          OR: [
            { product: { name: { contains: q, mode: "insensitive" as const } } },
            { product: { sku: { contains: q, mode: "insensitive" as const } } },
            { bundle: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [total, items] = await prisma.$transaction([
    prisma.productDiscount.count({ where }),
    prisma.productDiscount.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
      skip,
      take: pageSize,
      select: {
        id: true,
        branchId: true,
        type: true,
        value: true,
        buyQty: true,
        getQty: true,
        productId: true,
        bundleId: true,
        startsAt: true,
        endsAt: true,
        isActive: true,
        updatedAt: true,
        branch: { select: { name: true } },
        product: { select: { name: true, sku: true } },
        bundle: { select: { name: true } },
      },
    }),
  ]);

  const mapped: ProductDiscountListItem[] = items.map((d) => ({
    id: d.id,
    branchId: d.branchId ?? null,
    branchName: d.branch?.name ?? null,
    type: d.type,
    value: Number(d.value),
    buyQty: d.buyQty ?? null,
    getQty: d.getQty ?? null,
    productId: d.productId ?? null,
    productName: d.product?.name ?? null,
    sku: d.product?.sku ?? null,
    bundleId: d.bundleId ?? null,
    bundleName: d.bundle?.name ?? null,
    startsAt: d.startsAt ? d.startsAt.toISOString() : null,
    endsAt: d.endsAt ? d.endsAt.toISOString() : null,
    isActive: d.isActive,
    updatedAt: d.updatedAt.toISOString(),
  }));

  return { q, page, pageSize, total, items: mapped };
}

export async function upsertProductDiscount(params: { tenantId: string; input: UpsertProductDiscountInput }) {
  const { input } = params;

  if (input.branchId) {
    const branch = await prisma.branch.findFirst({ where: { id: input.branchId, tenantId: params.tenantId }, select: { id: true } });
    if (!branch) throw Errors.notFound("Cabang tidak ditemukan.");
  }
  if (input.productId) {
    const product = await prisma.product.findFirst({ where: { id: input.productId, tenantId: params.tenantId }, select: { id: true } });
    if (!product) throw Errors.notFound("Produk tidak ditemukan.");
  }
  if (input.bundleId) {
    const bundle = await prisma.productBundle.findFirst({ where: { id: input.bundleId, tenantId: params.tenantId }, select: { id: true } });
    if (!bundle) throw Errors.notFound("Bundle tidak ditemukan.");
  }

  const data = {
    tenantId: params.tenantId,
    branchId: input.branchId ?? null,
    type: input.type,
    value: input.value,
    buyQty: input.buyQty ?? null,
    getQty: input.getQty ?? null,
    productId: input.productId ?? null,
    bundleId: input.bundleId ?? null,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    isActive: input.isActive ?? true,
  };

  if (input.id) {
    const exists = await prisma.productDiscount.findFirst({ where: { id: input.id, tenantId: params.tenantId }, select: { id: true } });
    if (!exists) throw Errors.notFound("Rule diskon tidak ditemukan.");
    return prisma.productDiscount.update({ where: { id: exists.id }, data, select: { id: true } });
  }

  return prisma.productDiscount.create({ data, select: { id: true } });
}

export async function deleteProductDiscount(params: { tenantId: string; id: string }) {
  const exists = await prisma.productDiscount.findFirst({ where: { id: params.id, tenantId: params.tenantId }, select: { id: true } });
  if (!exists) throw Errors.notFound("Rule diskon tidak ditemukan.");
  await prisma.productDiscount.delete({ where: { id: exists.id } });
  return { id: exists.id };
}

