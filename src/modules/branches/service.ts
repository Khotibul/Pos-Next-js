import "server-only";

import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import type { UpsertBranchInput } from "@/modules/branches/validators";

export type BranchListItem = {
  id: string;
  name: string;
  code: string | null;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  updatedAt: Date;
};

export async function getBranchOverview(params: { tenantId: string }) {
  const [total, active, inactive] = await prisma.$transaction([
    prisma.branch.count({ where: { tenantId: params.tenantId } }),
    prisma.branch.count({ where: { tenantId: params.tenantId, isActive: true } }),
    prisma.branch.count({ where: { tenantId: params.tenantId, isActive: false } }),
  ]);
  return { total, active, inactive };
}

export async function listBranches(params: { tenantId: string; q?: string | null; categoryId?: string | null }) {
  const q = params.q?.trim() || null;
  const categoryId = params.categoryId?.trim() || null;
  const where = {
    tenantId: params.tenantId,
    ...(categoryId ? { categoryId } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { code: { contains: q } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };

  const items = await prisma.branch.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      code: true,
      categoryId: true,
      phone: true,
      address: true,
      isActive: true,
      updatedAt: true,
      category: { select: { id: true, name: true } },
    },
  });

  return { items: items as BranchListItem[], q, categoryId };
}

export async function listBranchMeta(params: { tenantId: string }) {
  const categories = await prisma.branchCategory.findMany({
    where: { tenantId: params.tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return { categories };
}

export async function listBranchOptions(params: { tenantId: string }) {
  return prisma.branch.findMany({
    where: { tenantId: params.tenantId, isActive: true },
    orderBy: { name: "asc" },
    take: 500,
    select: { id: true, name: true },
  });
}

export async function upsertBranch(params: { tenantId: string; input: UpsertBranchInput }) {
  const data = {
    tenantId: params.tenantId,
    name: params.input.name,
    code: params.input.code ? params.input.code : null,
    categoryId: params.input.categoryId ? params.input.categoryId : null,
    phone: params.input.phone ? params.input.phone : null,
    address: params.input.address ? params.input.address : null,
    isActive: params.input.isActive ?? true,
  };

  if (params.input.id) {
    const exists = await prisma.branch.findFirst({ where: { tenantId: params.tenantId, id: params.input.id }, select: { id: true } });
    if (!exists) throw Errors.notFound("Cabang tidak ditemukan.");
    return prisma.branch.update({ where: { id: params.input.id }, data, select: { id: true } });
  }

  return prisma.branch.create({ data, select: { id: true } });
}

export async function deleteBranch(params: { tenantId: string; id: string }) {
  const exists = await prisma.branch.findFirst({ where: { tenantId: params.tenantId, id: params.id }, select: { id: true } });
  if (!exists) throw Errors.notFound("Cabang tidak ditemukan.");
  await prisma.branch.delete({ where: { id: params.id } });
}
