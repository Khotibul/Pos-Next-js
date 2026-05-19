import "server-only";

import { prisma } from "@/lib/prisma";

export async function listTenantAuditLogs({ tenantId, take = 200 }: { tenantId: string; take?: number }) {
  return prisma.auditLog.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: Math.max(1, Math.min(take, 500)),
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

