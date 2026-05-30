import { NextResponse } from "next/server";
import { z } from "zod";
import { dequeueJob, markJobDone, markJobFailed, type QueueName } from "@/lib/queue";
import { sendEmail } from "@/lib/email/smtp";
import { writeSyncLog } from "@/lib/monitoring/log-service";

export const dynamic = "force-dynamic";

const schema = z.object({
  queue: z.enum(["email:queue", "sync:queue", "ocr:queue", "report:queue"]).default("email:queue"),
  take: z.number().int().min(1).max(25).default(5),
});

function isAuthorized(req: Request) {
  const secret = process.env.WORKER_SECRET?.trim();
  if (!secret) return false;
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const header = req.headers.get("x-worker-secret")?.trim();
  return bearer === secret || header === secret;
}

async function processEmailJob(job: Awaited<ReturnType<typeof dequeueJob>>) {
  if (!job) return false;
  if (job.payload.type !== "EMAIL_VERIFICATION") return false;
  await sendEmail({
    to: job.payload.to,
    subject: job.payload.subject,
    html: job.payload.html,
    text: job.payload.text,
  });
  return true;
}

async function processSyncJob(job: Awaited<ReturnType<typeof dequeueJob>>) {
  if (!job) return false;
  if (job.payload.type !== "DESKTOP_SYNC") return false;

  await writeSyncLog({
    tenantId: job.payload.tenantId,
    deviceId: job.payload.deviceId,
    entity: "DesktopSyncBatch",
    status: "QUEUED",
    message: `Received ${job.payload.records.length} records from Redis queue.`,
  });
  return true;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, message: "Unauthorized worker." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Invalid worker payload." }, { status: 400 });

  const queue = parsed.data.queue as QueueName;
  let processed = 0;
  let failed = 0;

  for (let i = 0; i < parsed.data.take; i++) {
    const job = await dequeueJob(queue);
    if (!job) break;

    try {
      const ok = queue === "email:queue" ? await processEmailJob(job) : await processSyncJob(job);
      if (!ok) throw new Error(`Unsupported job type: ${job.payload.type}`);
      await markJobDone(job);
      processed += 1;
    } catch (e) {
      failed += 1;
      await markJobFailed(job, e instanceof Error ? e.message : "Worker job failed.");
    }
  }

  return NextResponse.json({ ok: true, queue, processed, failed });
}
