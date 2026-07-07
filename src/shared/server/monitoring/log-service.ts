import "server-only";

import { prisma } from "@/shared/server/db/prisma";
import { Prisma } from "@prisma/client";

type BaseLogInput = {
  tenantId?: string | null;
  userId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function writeErrorLog(
  input: BaseLogInput & {
    source: string;
    message: string;
    stack?: string | null;
  },
) {
  try {
    await prisma.errorLog.create({
      data: {
        tenantId: input.tenantId ?? null,
        userId: input.userId ?? null,
        source: input.source,
        message: input.message,
        stack: input.stack ?? null,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    });
  } catch {
    // Monitoring is best-effort; never fail the request.
  }
}

export type AuthLogInput = {
  userId?: string | null;
  email?: string | null;
  event: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  provider?: string | null;
};

export async function writeAuthLog(input: AuthLogInput) {
  try {
    await prisma.authLog.create({
      data: {
        userId: input.userId ?? null,
        email: input.email ?? null,
        event: input.event,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        provider: input.provider ?? null,
      },
    });
  } catch {
    // Auth logging is best-effort.
  }
}

export async function writeSyncLog(
  input: BaseLogInput & {
    deviceId?: string | null;
    entity?: string | null;
    entityId?: string | null;
    status: string;
    message?: string | null;
  },
) {
  try {
    await prisma.syncLog.create({
      data: {
        tenantId: input.tenantId ?? null,
        deviceId: input.deviceId ?? null,
        entity: input.entity ?? null,
        entityId: input.entityId ?? null,
        status: input.status,
        message: input.message ?? null,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    });
  } catch {
    // Sync logging is best-effort.
  }
}
