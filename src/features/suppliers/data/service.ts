import "server-only";

import { prisma } from "@/shared/server/db/prisma";
import { Errors } from "@/shared/server/errors/app-error";
import type { UpsertSupplierInput } from "@/features/suppliers/validators";
import type { SupplierListItem, SupplierOverview } from "@/features/suppliers/domain/entity";

export async function getSupplierOverview(params: { tenantId: string }): Promise<SupplierOverview> {
  const [total, active] = await Promise.all([
    prisma.supplier.count({ where: { tenantId: params.tenantId } }),
    prisma.supplier.count({ where: { tenantId: params.tenantId, isActive: true } }),
  ]);
  return { total, active, inactive: Math.max(0, total - active) };
}

export async function listSuppliers(params: {
  tenantId: string;
  q?: string | null;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10));
  const q = params.q?.trim() || null;

  const where = {
    tenantId: params.tenantId,
    ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }] } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.supplier.count({ where }),
    prisma.supplier.findMany({
      where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize,
      select: { id: true, name: true, email: true, phone: true, address: true, isActive: true, createdAt: true },
    }),
  ]);

  return { items: items as SupplierListItem[], total, page, pageSize, q };
}

export async function upsertSupplier(params: { tenantId: string; input: UpsertSupplierInput }) {
  const data = {
    tenantId: params.tenantId,
    name: params.input.name,
    email: params.input.email ?? null,
    phone: params.input.phone ?? null,
    address: params.input.address ?? null,
    isActive: params.input.isActive ?? true,
  };

  if (params.input.id) {
    const exists = await prisma.supplier.findFirst({ where: { tenantId: params.tenantId, id: params.input.id }, select: { id: true } });
    if (!exists) throw Errors.notFound("Supplier tidak ditemukan.");
    return prisma.supplier.update({ where: { id: params.input.id }, data, select: { id: true } });
  }

  return prisma.supplier.create({ data, select: { id: true } });
}

export async function deleteSupplier(params: { tenantId: string; id: string }) {
  const exists = await prisma.supplier.findFirst({ where: { tenantId: params.tenantId, id: params.id }, select: { id: true } });
  if (!exists) throw Errors.notFound("Supplier tidak ditemukan.");
  await prisma.supplier.delete({ where: { id: params.id } });
}
