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
  errorText: string | null;
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
    `INSERT INTO SyncQueue (id, entity, entityId, action, payload, status, errorText, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, 'PENDING', NULL, ?, ?)`,
    [id, input.entity, input.entityId ?? null, input.action, JSON.stringify(input.payload), ts, ts],
  );
  return { id };
}

export async function listPendingQueue(db: DesktopDb, take = 100) {
  const n = Math.max(1, Math.min(500, take));
  const rows = await db.query<Record<string, unknown>>(
    `SELECT * FROM SyncQueue WHERE status='PENDING' ORDER BY createdAt ASC LIMIT ?`,
    [n],
  );
  return rows.map((r: Record<string, unknown>) => ({
    id: String(r.id),
    entity: String(r.entity),
    entityId: r.entityId == null ? null : String(r.entityId),
    action: String(r.action) as SyncAction,
    payload: safeJsonParse(String(r.payload ?? "{}")),
    status: String(r.status) as SyncStatus,
    errorText: r.errorText == null ? null : String(r.errorText),
    createdAt: toIsoMaybe(r.createdAt),
    updatedAt: toIsoMaybe(r.updatedAt),
  })) satisfies SyncQueueItem[];
}

export async function markQueueSent(db: DesktopDb, id: string) {
  const ts = new Date().toISOString();
  await db.execute(`UPDATE SyncQueue SET status='SENT', updatedAt=? WHERE id=?`, [ts, id]);
}

export async function markQueueFailed(db: DesktopDb, id: string, errorText: string) {
  const ts = new Date().toISOString();
  await db.execute(`UPDATE SyncQueue SET status='FAILED', errorText=?, updatedAt=? WHERE id=?`, [errorText, ts, id]);
}

export async function markQueuePending(db: DesktopDb, id: string) {
  const ts = new Date().toISOString();
  await db.execute(`UPDATE SyncQueue SET status='PENDING', errorText=NULL, updatedAt=? WHERE id=?`, [ts, id]);
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
