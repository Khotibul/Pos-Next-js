import crypto from "node:crypto";
import type { DesktopDb } from "./sqlite.js";

export type SyncAction = "CREATE" | "UPDATE" | "DELETE";
export type SyncStatus = "PENDING" | "SENT" | "FAILED";

export type SyncQueueItem = {
  id: string;
  entity: string;
  entityId: string | null;
  action: SyncAction;
  payload: unknown;
  status: SyncStatus;
  retryCount: number;
  nextRunAt: string | null;
  errorText: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function nowIso() {
  return new Date().toISOString();
}

function id32() {
  return crypto.randomBytes(16).toString("hex");
}

export async function enqueueOfflineChange(
  db: DesktopDb,
  input: { entity: string; entityId?: string | null; action: SyncAction; payload: unknown },
) {
  const id = id32();
  const ts = new Date().toISOString();
  await db.execute(
    `INSERT INTO SyncQueue (id, entity, entityId, action, payload, status, retryCount, nextRunAt, errorText, lastSyncedAt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, 'PENDING', 0, ?, NULL, NULL, ?, ?)`,
    [id, input.entity, input.entityId ?? null, input.action, JSON.stringify(input.payload), ts, ts, ts],
  );
  return { id };
}

export async function listPendingQueue(db: DesktopDb, take = 100) {
  const n = Math.max(1, Math.min(500, take));
  const ts = nowIso();
  const rows = await db.query<Record<string, unknown>>(
    `SELECT * FROM SyncQueue
     WHERE status IN ('PENDING', 'FAILED')
       AND (nextRunAt IS NULL OR nextRunAt <= ?)
     ORDER BY createdAt ASC
     LIMIT ?`,
    [ts, n],
  );
  return rows.map((r: Record<string, unknown>) => ({
    id: String(r.id),
    entity: String(r.entity),
    entityId: r.entityId == null ? null : String(r.entityId),
    action: String(r.action) as SyncAction,
    payload: safeJsonParse(String(r.payload ?? "{}")),
    status: String(r.status) as SyncStatus,
    retryCount: Number(r.retryCount ?? 0),
    nextRunAt: r.nextRunAt == null ? null : toIsoMaybe(r.nextRunAt),
    errorText: r.errorText == null ? null : String(r.errorText),
    lastSyncedAt: r.lastSyncedAt == null ? null : toIsoMaybe(r.lastSyncedAt),
    createdAt: toIsoMaybe(r.createdAt),
    updatedAt: toIsoMaybe(r.updatedAt),
  })) satisfies SyncQueueItem[];
}

export async function markQueueSent(db: DesktopDb, id: string) {
  const ts = new Date().toISOString();
  await db.execute(`UPDATE SyncQueue SET status='SENT', errorText=NULL, lastSyncedAt=?, updatedAt=? WHERE id=?`, [ts, ts, id]);
}

export async function markQueueFailed(db: DesktopDb, id: string, errorText: string, retryCount = 0) {
  const ts = new Date().toISOString();
  const safeRetryCount = Math.max(0, Math.min(20, retryCount + 1));
  const delayMs = Math.min(15 * 60_000, 2 ** safeRetryCount * 1_000);
  const nextRunAt = new Date(Date.now() + delayMs).toISOString();
  await db.execute(`UPDATE SyncQueue SET status='FAILED', retryCount=?, nextRunAt=?, errorText=?, updatedAt=? WHERE id=?`, [
    safeRetryCount,
    nextRunAt,
    errorText,
    ts,
    id,
  ]);
}

export async function markQueuePending(db: DesktopDb, id: string) {
  const ts = new Date().toISOString();
  await db.execute(`UPDATE SyncQueue SET status='PENDING', nextRunAt=?, errorText=NULL, updatedAt=? WHERE id=?`, [ts, ts, id]);
}

export async function getSyncQueueStatus(db: DesktopDb) {
  const rows = await db.query<{ status: string; total: number }>(
    `SELECT status, COUNT(*) as total FROM SyncQueue GROUP BY status`,
  );
  return {
    pending: Number(rows.find((row) => row.status === "PENDING")?.total ?? 0),
    failed: Number(rows.find((row) => row.status === "FAILED")?.total ?? 0),
    sent: Number(rows.find((row) => row.status === "SENT")?.total ?? 0),
  };
}

function safeJsonParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function toIsoMaybe(v: unknown) {
  if (v instanceof Date) return v.toISOString();
  const s = String(v ?? "");
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? nowIso() : d.toISOString();
}
