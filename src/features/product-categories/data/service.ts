import "server-only";

import { prisma } from "@/shared/server/db/prisma";
import { Errors } from "@/shared/server/errors/app-error";
import type { UpsertProductCategoryInput } from "@/features/product-categories/validators";

export async function getProductCategoryOverview(params: { tenantId: string }) {
  const total = await prisma.productCategory.count({ where: { tenantId: params.tenantId } });
  return { total };
}

export async function listProductCategories(params: { tenantId: string; q?: string | null }) {
  const q = params.q?.trim() || null;
  const items = await prisma.productCategory.findMany({
    where: { tenantId: params.tenantId, ...(q ? { name: { contains: q } } : {}) },
    orderBy: { name: "asc" },
    take: 200,
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });
  return { items, q };
}

export async function upsertProductCategory(params: { tenantId: string; input: UpsertProductCategoryInput }) {
  const data = { tenantId: params.tenantId, name: params.input.name };

  if (params.input.id) {
    const exists = await prisma.productCategory.findFirst({ where: { tenantId: params.tenantId, id: params.input.id }, select: { id: true } });
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
