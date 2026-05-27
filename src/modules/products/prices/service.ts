import "server-only";

import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import type { UpsertProductPriceInput } from "@/modules/products/prices/validators";

export type ProductPriceListItem = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  branchId: string | null;
  branchName: string | null;
  priceType: string;
  price: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  updatedAt: string;
};

export async function listProductPrices(params: { tenantId: string; q?: string | null; branchId?: string | null; page?: number; pageSize?: number }) {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(50, Math.max(5, Math.floor(params.pageSize ?? 20)));
  const skip = (page - 1) * pageSize;
  const q = params.q?.trim() ? params.q.trim() : null;

  const where = {
    tenantId: params.tenantId,
    ...(params.branchId ? { branchId: params.branchId } : {}),
    ...(q
      ? {
          OR: [
            { product: { name: { contains: q, mode: "insensitive" as const } } },
            { product: { sku: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [total, items] = await prisma.$transaction([
    prisma.productPrice.count({ where }),
    prisma.productPrice.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
      skip,
      take: pageSize,
      select: {
        id: true,
        productId: true,
        branchId: true,
        priceType: true,
        price: true,
        startsAt: true,
        endsAt: true,
        isActive: true,
        updatedAt: true,
        product: { select: { name: true, sku: true } },
        branch: { select: { name: true } },
      },
    }),
  ]);

  const mapped: ProductPriceListItem[] = items.map((p) => ({
    id: p.id,
    productId: p.productId,
    productName: p.product.name,
    sku: p.product.sku,
    branchId: p.branchId ?? null,
    branchName: p.branch?.name ?? null,
    priceType: p.priceType,
    price: Number(p.price),
    startsAt: p.startsAt ? p.startsAt.toISOString() : null,
    endsAt: p.endsAt ? p.endsAt.toISOString() : null,
    isActive: p.isActive,
    updatedAt: p.updatedAt.toISOString(),
  }));

  return { q, page, pageSize, total, items: mapped };
}

export async function upsertProductPrice(params: { tenantId: string; userId: string; input: UpsertProductPriceInput }) {
  const { input } = params;
  const product = await prisma.product.findFirst({ where: { id: input.productId, tenantId: params.tenantId }, select: { id: true } });
  if (!product) throw Errors.notFound("Produk tidak ditemukan.");

  if (input.branchId) {
    const branch = await prisma.branch.findFirst({ where: { id: input.branchId, tenantId: params.tenantId }, select: { id: true } });
    if (!branch) throw Errors.notFound("Cabang tidak ditemukan.");
  }

  const data = {
    tenantId: params.tenantId,
    productId: input.productId,
    branchId: input.branchId ?? null,
    priceType: input.priceType,
    price: input.price,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    isActive: input.isActive ?? true,
  };

  if (input.id) {
    const exists = await prisma.productPrice.findFirst({ where: { id: input.id, tenantId: params.tenantId }, select: { id: true, productId: true } });
    if (!exists) throw Errors.notFound("Rule harga tidak ditemukan.");

    const updated = await prisma.productPrice.update({ where: { id: exists.id }, data, select: { id: true } });
    await prisma.productPriceHistory.create({
      data: {
        tenantId: params.tenantId,
        branchId: data.branchId,
        productId: data.productId,
        priceType: data.priceType,
        price: data.price,
        changedById: params.userId,
      },
      select: { id: true },
    });
    return updated;
  }

  const created = await prisma.productPrice.create({ data, select: { id: true } });
  await prisma.productPriceHistory.create({
    data: {
      tenantId: params.tenantId,
      branchId: data.branchId,
      productId: data.productId,
      priceType: data.priceType,
      price: data.price,
      changedById: params.userId,
    },
    select: { id: true },
  });
  return created;
}

export async function deleteProductPrice(params: { tenantId: string; id: string }) {
  const exists = await prisma.productPrice.findFirst({ where: { id: params.id, tenantId: params.tenantId }, select: { id: true } });
  if (!exists) throw Errors.notFound("Rule harga tidak ditemukan.");
  await prisma.productPrice.delete({ where: { id: exists.id } });
  return { id: exists.id };
}

export async function getEffectiveRetailPrice(params: { tenantId: string; branchId?: string | null; productId: string; at?: Date }) {
  const at = params.at ?? new Date();
  const rules = await prisma.productPrice.findMany({
    where: {
      tenantId: params.tenantId,
      productId: params.productId,
      isActive: true,
      priceType: "RETAIL",
      OR: [
        params.branchId ? { branchId: params.branchId } : { branchId: null },
        { branchId: null },
      ],
    },
    orderBy: [{ branchId: "desc" }, { startsAt: "desc" }, { updatedAt: "desc" }],
    take: 50,
    select: { id: true, branchId: true, price: true, startsAt: true, endsAt: true },
  });

  for (const r of rules) {
    const withinStart = !r.startsAt || r.startsAt <= at;
    const withinEnd = !r.endsAt || r.endsAt >= at;
    if (withinStart && withinEnd) return Number(r.price);
  }
  return null;
}

