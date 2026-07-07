import "server-only";

import { prisma } from "@/shared/server/db/prisma";

export async function writeAuditLog(input: {
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      tenantId: input.tenantId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      metadata: input.metadata as never,
    },
  });
}
