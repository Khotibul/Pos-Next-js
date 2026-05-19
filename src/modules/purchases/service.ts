import "server-only";

import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import type { UpsertPurchaseOrderInput } from "@/modules/purchases/validators";

function genOrderNo() {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PO-${y}${m}${day}-${rand}`;
}

export async function listPurchaseOrders({ tenantId }: { tenantId: string }) {
  return prisma.purchaseOrder.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: { supplier: { select: { id: true, name: true } }, _count: { select: { items: true } } },
  });
}

export async function listSuppliersForSelect({ tenantId }: { tenantId: string }) {
  return prisma.supplier.findMany({
    where: { tenantId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function upsertPurchaseOrder({ tenantId, input }: { tenantId: string; input: UpsertPurchaseOrderInput }) {
  const supplierId = (input.supplierId || "").trim() || null;
  const orderNo = (input.orderNo || "").trim() || genOrderNo();
  const notes = (input.notes || "").trim() || null;

  if (supplierId) {
    const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, tenantId }, select: { id: true } });
    if (!supplier) throw Errors.badRequest("Supplier tidak valid.");
  }

  if (input.id) {
    const exists = await prisma.purchaseOrder.findFirst({ where: { id: input.id, tenantId }, select: { id: true } });
    if (!exists) throw Errors.notFound("PO tidak ditemukan.");
    return prisma.purchaseOrder.update({
      where: { id: input.id },
      data: { supplierId, orderNo, status: input.status, notes },
      select: { id: true },
    });
  }

  return prisma.purchaseOrder.create({
    data: { tenantId, supplierId, orderNo, status: input.status, notes },
    select: { id: true },
  });
}

export async function deletePurchaseOrder({ tenantId, id }: { tenantId: string; id: string }) {
  const exists = await prisma.purchaseOrder.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!exists) throw Errors.notFound("PO tidak ditemukan.");
  await prisma.purchaseOrder.delete({ where: { id } });
  return { id };
}
