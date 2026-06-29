import "server-only";

import { getRedisClient } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

export type AuditLogJob = {
  type: "AUDIT_LOG";
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: unknown;
  timestamp: string;
};

const AUDIT_QUEUE_KEY = "audit:queue";
const AUDIT_BATCH_SIZE = Number(process.env.AUDIT_BATCH_SIZE ?? 50);
const AUDIT_FLUSH_INTERVAL_MS = Number(process.env.AUDIT_FLUSH_INTERVAL_MS ?? 5000);

let auditBuffer: AuditLogJob[] = [];
let flushTimer: NodeJS.Timeout | null = null;
let isFlushing = false;

async function flushAuditBuffer() {
  if (isFlushing || auditBuffer.length === 0) return;

  isFlushing = true;
  const jobsToFlush = [...auditBuffer];
  auditBuffer = [];

  try {
    const redis = getRedisClient();
    if (redis && jobsToFlush.length > 0) {
      await redis.lpush(AUDIT_QUEUE_KEY, ...jobsToFlush.map((j) => JSON.stringify(j)));
    } else if (jobsToFlush.length > 0) {
      await prisma.auditLog.createMany({
        data: jobsToFlush.map((j) => ({
          tenantId: j.tenantId ?? null,
          userId: j.userId ?? null,
          action: j.action,
          entity: j.entity,
          entityId: j.entityId ?? null,
          metadata: j.metadata as never,
          createdAt: new Date(j.timestamp),
        })),
        skipDuplicates: true,
      });
    }
  } catch (error) {
    console.error("[audit] Failed to flush audit logs:", error);
    auditBuffer.unshift(...jobsToFlush);
  } finally {
    isFlushing = false;
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushAuditBuffer();
  }, AUDIT_FLUSH_INTERVAL_MS);
}

export async function writeAuditLog(input: {
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: unknown;
}) {
  const job: AuditLogJob = {
    type: "AUDIT_LOG",
    tenantId: input.tenantId ?? null,
    userId: input.userId ?? null,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId ?? null,
    metadata: input.metadata,
    timestamp: new Date().toISOString(),
  };

  auditBuffer.push(job);

  if (auditBuffer.length >= AUDIT_BATCH_SIZE) {
    await flushAuditBuffer();
  } else {
    scheduleFlush();
  }
}

export async function processAuditQueue(): Promise<number> {
  const redis = getRedisClient();
  if (!redis) return 0;

  let processed = 0;
  const batchSize = 100;

  while (true) {
    const jobs = await redis.lrange(AUDIT_QUEUE_KEY, 0, batchSize - 1);
    if (jobs.length === 0) break;

    try {
      await prisma.auditLog.createMany({
        data: jobs.map((j) => {
          const parsed = JSON.parse(j) as AuditLogJob;
          return {
            tenantId: parsed.tenantId ?? null,
            userId: parsed.userId ?? null,
            action: parsed.action,
            entity: parsed.entity,
            entityId: parsed.entityId ?? null,
            metadata: parsed.metadata as never,
            createdAt: new Date(parsed.timestamp),
          };
        }),
        skipDuplicates: true,
      });
      await redis.ltrim(AUDIT_QUEUE_KEY, jobs.length, -1);
      processed += jobs.length;
    } catch (error) {
      console.error("[audit] Failed to process audit queue:", error);
      break;
    }
  }

  return processed;
}

export async function forceFlushAuditLogs() {
  await flushAuditBuffer();
}

