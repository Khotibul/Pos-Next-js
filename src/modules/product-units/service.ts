import "server-only";

import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import type { UpsertProductUnitInput } from "@/modules/product-units/validators";

export type ProductUnitListItem = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function getProductUnitOverview(params: { tenantId: string }) {
  const total = await prisma.productUnit.count({ where: { tenantId: params.tenantId } });
  return { total };
}

export async function listProductUnits(params: { tenantId: string; q?: string | null }) {
  const q = params.q?.trim() || null;
  const where = {
    tenantId: params.tenantId,
    ...(q ? { name: { contains: q } } : {}),
  };

  const items = await prisma.productUnit.findMany({
    where,
    orderBy: { name: "asc" },
    take: 200,
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });

  return { items: items as ProductUnitListItem[], q };
}

export async function upsertProductUnit(params: { tenantId: string; input: UpsertProductUnitInput }) {
  const data = {
    tenantId: params.tenantId,
    name: params.input.name,
  };

  if (params.input.id) {
    const exists = await prisma.productUnit.findFirst({ where: { tenantId: params.tenantId, id: params.input.id }, select: { id: true } });
    if (!exists) throw Errors.notFound("Satuan tidak ditemukan.");
    return prisma.productUnit.update({ where: { id: params.input.id }, data, select: { id: true } });
  }

  return prisma.productUnit.create({ data, select: { id: true } });
}

export async function deleteProductUnit(params: { tenantId: string; id: string }) {
  const exists = await prisma.productUnit.findFirst({ where: { tenantId: params.tenantId, id: params.id }, select: { id: true } });
  if (!exists) throw Errors.notFound("Satuan tidak ditemukan.");
  await prisma.productUnit.delete({ where: { id: params.id } });
}

