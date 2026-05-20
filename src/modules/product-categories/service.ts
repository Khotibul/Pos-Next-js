import "server-only";

import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import type { UpsertProductCategoryInput } from "@/modules/product-categories/validators";

export type ProductCategoryListItem = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function getProductCategoryOverview(params: { tenantId: string }) {
  const total = await prisma.productCategory.count({ where: { tenantId: params.tenantId } });
  return { total };
}

export async function listProductCategories(params: { tenantId: string; q?: string | null }) {
  const q = params.q?.trim() || null;
  const where = {
    tenantId: params.tenantId,
    ...(q ? { name: { contains: q } } : {}),
  };

  const items = await prisma.productCategory.findMany({
    where,
    orderBy: { name: "asc" },
    take: 200,
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });

  return { items: items as ProductCategoryListItem[], q };
}

export async function upsertProductCategory(params: { tenantId: string; input: UpsertProductCategoryInput }) {
  const data = {
    tenantId: params.tenantId,
    name: params.input.name,
  };

  if (params.input.id) {
    const exists = await prisma.productCategory.findFirst({
      where: { tenantId: params.tenantId, id: params.input.id },
      select: { id: true },
    });
    if (!exists) throw Errors.notFound("Kategori tidak ditemukan.");
    return prisma.productCategory.update({ where: { id: params.input.id }, data, select: { id: true } });
  }

  return prisma.productCategory.create({ data, select: { id: true } });
}

export async function deleteProductCategory(params: { tenantId: string; id: string }) {
  const exists = await prisma.productCategory.findFirst({ where: { tenantId: params.tenantId, id: params.id }, select: { id: true } });
  if (!exists) throw Errors.notFound("Kategori tidak ditemukan.");
  await prisma.productCategory.delete({ where: { id: params.id } });
}

