import "server-only";

import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import type { CloseShiftInput, OpenShiftInput } from "@/modules/shifts/validators";

export async function listShifts({ tenantId, take = 50 }: { tenantId: string; take?: number }) {
  return prisma.cashierShift.findMany({
    where: { tenantId },
    orderBy: { openedAt: "desc" },
    take: Math.max(1, Math.min(take, 200)),
    include: { cashier: { select: { id: true, name: true, email: true } } },
  });
}

export async function getOpenShift({ tenantId, cashierUserId }: { tenantId: string; cashierUserId: string }) {
  return prisma.cashierShift.findFirst({
    where: { tenantId, cashierUserId, status: "OPEN" },
    orderBy: { openedAt: "desc" },
  });
}

export async function openShift({ tenantId, cashierUserId, input }: { tenantId: string; cashierUserId: string; input: OpenShiftInput }) {
  const existing = await getOpenShift({ tenantId, cashierUserId });
  if (existing) throw Errors.badRequest("Shift masih OPEN. Tutup shift terlebih dahulu.");

  return prisma.cashierShift.create({
    data: {
      tenantId,
      cashierUserId,
      status: "OPEN",
      openingCash: input.openingCash,
      note: (input.note || "").trim() || null,
    },
    select: { id: true },
  });
}

export async function closeShift({ tenantId, cashierUserId, input }: { tenantId: string; cashierUserId: string; input: CloseShiftInput }) {
  const shift = await prisma.cashierShift.findFirst({
    where: { id: input.id, tenantId, cashierUserId },
    select: { id: true, status: true },
  });
  if (!shift) throw Errors.notFound("Shift tidak ditemukan.");
  if (shift.status !== "OPEN") throw Errors.badRequest("Shift sudah CLOSED.");

  return prisma.cashierShift.update({
    where: { id: input.id },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      closingCash: input.closingCash,
      note: (input.note || "").trim() || null,
    },
    select: { id: true },
  });
}

