import "server-only";

import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import type { UpsertBranchCategoryInput } from "@/modules/branch-categories/validators";

export type BranchCategoryListItem = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function getBranchCategoryOverview(params: { tenantId: string }) {
  const total = await prisma.branchCategory.count({ where: { tenantId: params.tenantId } });
  return { total };
}

export async function listBranchCategories(params: { tenantId: string; q?: string | null }) {
  const q = params.q?.trim() || null;
  const where = {
    tenantId: params.tenantId,
    ...(q ? { name: { contains: q } } : {}),
  };

  const items = await prisma.branchCategory.findMany({
    where,
    orderBy: { name: "asc" },
    take: 200,
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });

  return { items: items as BranchCategoryListItem[], q };
}

export async function upsertBranchCategory(params: { tenantId: string; input: UpsertBranchCategoryInput }) {
  const data = { tenantId: params.tenantId, name: params.input.name };

  if (params.input.id) {
    const exists = await prisma.branchCategory.findFirst({
      where: { tenantId: params.tenantId, id: params.input.id },
      select: { id: true },
    });
    if (!exists) throw Errors.notFound("Kategori cabang tidak ditemukan.");
    return prisma.branchCategory.update({ where: { id: params.input.id }, data, select: { id: true } });
  }

  return prisma.branchCategory.create({ data, select: { id: true } });
}

export async function deleteBranchCategory(params: { tenantId: string; id: string }) {
  const exists = await prisma.branchCategory.findFirst({
    where: { tenantId: params.tenantId, id: params.id },
    select: { id: true },
  });
  if (!exists) throw Errors.notFound("Kategori cabang tidak ditemukan.");
  await prisma.branchCategory.delete({ where: { id: params.id } });
}

