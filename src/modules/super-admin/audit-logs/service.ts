import "server-only";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/super-admin";

export async function listAuditLogs(limit = 200) {
  await requireSuperAdmin();
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.max(1, Math.min(limit, 500)),
    include: {
      tenant: { select: { id: true, name: true, slug: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });
}
