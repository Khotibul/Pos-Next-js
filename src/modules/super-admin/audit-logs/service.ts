import "server-only";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/super-admin";

export async function listAuditLogs(params: {
  page?: number;
  pageSize?: number;
  tenantId?: string | null;
  action?: string | null;
  entity?: string | null;
  userId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
} = {}) {
  await requireSuperAdmin();
  
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  
  const where: Record<string, unknown> = {};
  
  if (params.tenantId) where.tenantId = params.tenantId;
  if (params.action) where.action = { contains: params.action };
  if (params.entity) where.entity = { contains: params.entity };
  if (params.userId) where.userId = params.userId;
  
  if (params.dateFrom || params.dateTo) {
    where.createdAt = {};
    if (params.dateFrom) (where.createdAt as Record<string, string>).gte = params.dateFrom;
    if (params.dateTo) (where.createdAt as Record<string, string>).lte = params.dateTo;
  }
  
  const [total, items] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);
  
  return { items, total, page, pageSize };
}
