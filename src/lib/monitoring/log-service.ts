import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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
  await prisma.errorLog
    .create({
      data: {
        tenantId: input.tenantId ?? null,
        userId: input.userId ?? null,
        source: input.source,
        message: input.message,
        stack: input.stack ?? null,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    })
    .catch(() => null);
}

export async function writeAuthLog(
  input: BaseLogInput & {
    email?: string | null;
    provider?: string | null;
    event: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
) {
  await prisma.authLog
    .create({
      data: {
        tenantId: input.tenantId ?? null,
        userId: input.userId ?? null,
        email: input.email ?? null,
        provider: input.provider ?? null,
        event: input.event,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    })
    .catch(() => null);
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
  await prisma.syncLog
    .create({
      data: {
        tenantId: input.tenantId ?? null,
        deviceId: input.deviceId ?? null,
        entity: input.entity ?? null,
        entityId: input.entityId ?? null,
        status: input.status,
        message: input.message ?? null,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    })
    .catch(() => null);
}
