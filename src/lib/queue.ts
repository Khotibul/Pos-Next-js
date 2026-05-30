import "server-only";

import crypto from "node:crypto";
import { getRedisClient } from "@/lib/redis";

export type QueueName = "email:queue" | "sync:queue" | "ocr:queue" | "report:queue";

export type EmailVerificationJob = {
  type: "EMAIL_VERIFICATION";
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type DesktopSyncJob = {
  type: "DESKTOP_SYNC";
  tenantId: string;
  deviceId: string;
  records: unknown[];
};

export type GenericJob = {
  type: "GENERIC";
  payload: unknown;
};

export type QueueJobPayload = EmailVerificationJob | DesktopSyncJob | GenericJob;

export type QueueJob = {
  id: string;
  queue: QueueName;
  payload: QueueJobPayload;
  attempts: number;
  createdAt: string;
};

function queueNameForType(type: QueueJobPayload["type"]): QueueName {
  if (type === "EMAIL_VERIFICATION") return "email:queue";
  if (type === "DESKTOP_SYNC") return "sync:queue";
  if (type.includes("OCR")) return "ocr:queue";
  if (type.includes("REPORT")) return "report:queue";
  return "sync:queue";
}

export async function enqueueJob(payload: QueueJobPayload, queue?: QueueName) {
  const redis = getRedisClient();
  const targetQueue = queue ?? queueNameForType(payload.type);
  const job: QueueJob = {
    id: crypto.randomUUID(),
    queue: targetQueue,
    payload,
    attempts: 0,
    createdAt: new Date().toISOString(),
  };

  if (!redis) return { queued: false, job };

  try {
    await redis.lpush(targetQueue, job);
    return { queued: true, job };
  } catch {
    return { queued: false, job };
  }
}

export async function dequeueJob(queue: QueueName): Promise<QueueJob | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    return await redis.rpop<QueueJob>(queue);
  } catch {
    return null;
  }
}

export async function markJobDone(job: QueueJob) {
  const redis = getRedisClient();
  if (!redis) return;
  await redis.set(`queue:done:${job.id}`, { queue: job.queue, finishedAt: new Date().toISOString() }, { ex: 86_400 }).catch(() => null);
}

export async function markJobFailed(job: QueueJob, message: string) {
  const redis = getRedisClient();
  if (!redis) return;

  const failedJob = { ...job, attempts: job.attempts + 1 };
  await redis
    .set(`queue:failed:${job.id}`, { queue: job.queue, message, failedAt: new Date().toISOString() }, { ex: 86_400 })
    .catch(() => null);

  if (failedJob.attempts < 3) {
    await redis.lpush(job.queue, failedJob).catch(() => null);
  }
}
