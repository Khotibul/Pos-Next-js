import type { DesktopDb } from "./sqlite.js";
import { listPendingQueue, markQueueFailed, markQueueSent, type SyncQueueItem } from "./offline-sync.js";

export type OfflineSyncWorkerOptions = {
  db: DesktopDb;
  endpoint: string;
  getAuthToken?: () => Promise<string | null> | (string | null);
  intervalMs?: number;
  batchSize?: number;
};

export function startOfflineSyncWorker(opts: OfflineSyncWorkerOptions) {
  const intervalMs = Math.max(5_000, Math.min(120_000, opts.intervalMs ?? 15_000));
  const batchSize = Math.max(1, Math.min(200, opts.batchSize ?? 50));
  let stopped = false;
  let timer: NodeJS.Timeout | null = null;
  let running = false;

  async function getToken() {
    if (!opts.getAuthToken) return null;
    return typeof opts.getAuthToken === "function" ? await opts.getAuthToken() : opts.getAuthToken;
  }

  async function sendItem(item: SyncQueueItem) {
    const token = await getToken();
    const res = await fetch(opts.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Sync failed (${res.status}) ${text}`.trim());
    }
  }

  async function tick() {
    if (stopped || running) return;
    running = true;
    try {
      const items = await listPendingQueue(opts.db, batchSize);
      for (const item of items) {
        if (stopped) break;
        try {
          await sendItem(item);
          await markQueueSent(opts.db, item.id);
        } catch (e) {
          await markQueueFailed(opts.db, item.id, e instanceof Error ? e.message : "Sync error");
          break; // stop batch on first failure to avoid burning CPU
        }
      }
    } finally {
      running = false;
    }
  }

  timer = setInterval(() => void tick(), intervalMs);
  void tick();

  return {
    stop() {
      stopped = true;
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}
