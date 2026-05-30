// Guard: if someone runs Electron with ELECTRON_RUN_AS_NODE=1, the runtime APIs won't be available.
// This env var MUST NOT be set for the desktop app process.
if (process.env.ELECTRON_RUN_AS_NODE === "1") {
  // eslint-disable-next-line no-console
  console.error(
    "[electron] ELECTRON_RUN_AS_NODE=1 terdeteksi. Ini membuat Electron berjalan sebagai Node dan `require('electron')` tidak menyediakan API. " +
      "Hapus env var ini lalu jalankan ulang. (PowerShell: `Remove-Item Env:ELECTRON_RUN_AS_NODE`)",
  );
  process.exit(1);
}

// Use CommonJS `require('electron')` for maximum compatibility.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const electronRuntime = require("electron") as typeof import("electron");
if (typeof (electronRuntime as unknown) === "string") {
  // eslint-disable-next-line no-console
  console.error(
    "[electron] `require('electron')` mengembalikan path executable, bukan API runtime. " +
      "Ini biasanya terjadi jika Electron berjalan dalam mode `run as node` (ELECTRON_RUN_AS_NODE). " +
      "Pastikan variabel environment tersebut TIDAK diset saat menjalankan aplikasi desktop.",
  );
  process.exit(1);
}
const { app, BrowserWindow, ipcMain } = electronRuntime;
type BrowserWindowT = import("electron").BrowserWindow;
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import crypto from "node:crypto";
import { openDesktopDb, getCurrentLicense, activateLicenseOffline, decryptStoredLicense, isLicenseValidNow } from "../src/lib/license/service.js";
import { startOfflineSyncWorker } from "../src/lib/db/offline-sync-worker.js";
import { getSyncQueueStatus } from "../src/lib/db/offline-sync.js";

// In some locked-down environments (including CI/sandboxes), writing to the default
// `%APPDATA%/<appName>` path may be blocked. For dev runs, allow a local userData folder.
// Packaged apps keep the OS-default userData path.
if (!app.isPackaged) {
  const override = process.env.DESKTOP_USERDATA_DIR?.trim();
  const devUserData = override ? path.resolve(override) : path.resolve(process.cwd(), ".desktop-userdata");
  try {
    app.setPath("userData", devUserData);
  } catch {
    // ignore; fall back to Electron default
  }
}

const isDev = !app.isPackaged;

// Some Windows environments crash/deny GPU or sandbox network directories.
// Keep production hardened, but relax a bit for dev to avoid blocking startup.
if (isDev) {
  try {
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch("disable-gpu");
    app.commandLine.appendSwitch("disable-gpu-sandbox");
    app.commandLine.appendSwitch("disable-software-rasterizer");
  } catch {
    // ignore
  }
}

function getUserDataPath() {
  return app.getPath("userData");
}

function ensureDir(dir: string) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

function canWriteToDir(dir: string) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, ".probe");
    fs.writeFileSync(probe, "ok", "utf8");
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

function getAppPaths() {
  let userData = getUserDataPath();
  let dataDir = path.join(userData, "data");
  let backupDir = path.join(userData, "backup");
  let logsDir = path.join(userData, "logs");

  const ok =
    ensureDir(dataDir) &&
    ensureDir(backupDir) &&
    ensureDir(logsDir) &&
    canWriteToDir(dataDir) &&
    canWriteToDir(backupDir) &&
    canWriteToDir(logsDir);
  if (ok) return { userData, dataDir, backupDir, logsDir };

  // Fallback for restricted environments: use temp folder.
  const fallbackUserData = path.join(os.tmpdir(), "pos-desktop-userdata");
  try {
    app.setPath("userData", fallbackUserData);
  } catch {
    // ignore
  }

  userData = getUserDataPath();
  dataDir = path.join(userData, "data");
  backupDir = path.join(userData, "backup");
  logsDir = path.join(userData, "logs");
  ensureDir(dataDir);
  ensureDir(backupDir);
  ensureDir(logsDir);
  return { userData, dataDir, backupDir, logsDir };
}

function getDeviceFingerprint() {
  const parts = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus()?.[0]?.model ?? "",
    String(os.totalmem()),
  ].join("|");
  return crypto.createHash("sha256").update(parts).digest("hex");
}

let mainWindow: BrowserWindowT | null = null;
let desktopDb: Awaited<ReturnType<typeof openDesktopDb>> | null = null;
let cachedDeviceId: string | null = null;
let syncWorkerStop: null | (() => void) = null;

function getEnvString(key: string) {
  const v = process.env[key];
  return typeof v === "string" ? v.trim() : "";
}

function safeUrl(v: string) {
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) return null;
  try {
    return new URL(v).toString();
  } catch {
    return null;
  }
}

function getRendererUrl() {
  // Dev: default to localhost:3000 (Next dev is started by scripts).
  if (!app.isPackaged) {
    return safeUrl(getEnvString("ELECTRON_RENDERER_URL")) || "http://localhost:3000";
  }
  // Prod: use hosted renderer URL (Vercel/etc). Do NOT spawn local Next server.
  return safeUrl(getEnvString("ELECTRON_RENDERER_URL")) || safeUrl(getPackagedRendererUrlFromMetadata());
}

function getPackagedRendererUrlFromMetadata() {
  // Allow shipping a default hosted renderer URL inside the packaged app.
  // This avoids requiring users to set env vars manually after install.
  try {
    const pkgPath = path.join(app.getAppPath(), "package.json");
    if (!fs.existsSync(pkgPath)) return "";
    const raw = fs.readFileSync(pkgPath, "utf8");
    const json = JSON.parse(raw) as { desktopRendererUrl?: unknown; build?: { extraMetadata?: { desktopRendererUrl?: unknown } } };
    if (typeof json.desktopRendererUrl === "string") return json.desktopRendererUrl;
    const nested = json.build?.extraMetadata?.desktopRendererUrl;
    return typeof nested === "string" ? nested : "";
  } catch {
    return "";
  }
}

function escapeHtml(s: string) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeJs(s: string) {
  return String(s).replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function fallbackHtml(opts: { title: string; message: string; details?: string }) {
  const details = opts.details
    ? `<pre style="white-space:pre-wrap;background:#0b1220;color:#fff;padding:12px;border-radius:10px;">${escapeHtml(opts.details)}</pre>`
    : "";
  return `data:text/html;charset=utf-8,${encodeURIComponent(`
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>${escapeHtml(opts.title)}</title>
      </head>
      <body style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; background:#0b1220; color:#e5e7eb;">
        <div style="max-width:760px;margin:0 auto;padding:28px;">
          <h2 style="margin:0 0 8px 0;">${escapeHtml(opts.title)}</h2>
          <p style="margin:0 0 16px 0; color:#cbd5e1;">${escapeHtml(opts.message)}</p>
          ${details}
          <div style="margin-top:18px; display:flex; gap:10px; flex-wrap:wrap;">
            <button onclick="location.reload()" style="padding:10px 14px;border-radius:10px;border:1px solid #334155;background:#111827;color:#e5e7eb;cursor:pointer;">Reload</button>
            <button onclick="navigator.clipboard?.writeText('${escapeJs(getEnvString("ELECTRON_RENDERER_URL"))}').catch(()=>{})" style="padding:10px 14px;border-radius:10px;border:1px solid #334155;background:#111827;color:#e5e7eb;cursor:pointer;">Copy URL env</button>
          </div>
          <div style="margin-top:22px;color:#94a3b8;font-size:12px;">
            <div>Production butuh <code>ELECTRON_RENDERER_URL</code> (contoh: https://pos-next-js-kohl.vercel.app).</div>
            <div>Dev jalankan <code>npm.cmd run dev:desktop</code>.</div>
          </div>
        </div>
      </body>
    </html>
  `)}`;
}

async function createMainWindow() {
  const preloadPath = path.join(__dirname, "preload.js");
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#0b1220",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      // Keep sandbox off for desktop app reliability (preload/IPC).
      sandbox: false,
    },
  });

  // Security: never allow the app to open arbitrary new windows.
  // External links can be handled via a whitelisted renderer flow later.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  const rendererUrl = getRendererUrl();
  if (!rendererUrl) {
    await mainWindow.loadURL(
      fallbackHtml({
        title: "Renderer production belum dikonfigurasi",
        message:
          "Aplikasi Desktop membutuhkan renderer URL (hosted). Set environment variable ELECTRON_RENDERER_URL (contoh: https://pos-next-js-kohl.vercel.app).",
        details: `isPackaged=${String(app.isPackaged)}\nappPath=${app.getAppPath()}\nuserData=${app.getPath("userData")}`,
      }),
    );
    return;
  }

  try {
    await mainWindow.loadURL(rendererUrl);
    if (!app.isPackaged && process.env.ELECTRON_DEVTOOLS === "1") {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.stack || e.message : String(e);
    await mainWindow.loadURL(
      fallbackHtml({
        title: "Gagal membuka renderer",
        message: `Tidak bisa memuat URL: ${rendererUrl}`,
        details: msg,
      }),
    );
  }
}

app.on("ready", async () => {
  const { userData } = getAppPaths();
  cachedDeviceId = getDeviceFingerprint();
  try {
    desktopDb = await openDesktopDb({ userDataDir: userData });
    const endpoint = process.env.DESKTOP_SYNC_ENDPOINT?.trim();
    if (endpoint) {
      const worker = startOfflineSyncWorker({ db: desktopDb, endpoint });
      syncWorkerStop = () => worker.stop();
    }
  } catch (e) {
    // DB init errors will be shown in renderer; keep app running.
    // eslint-disable-next-line no-console
    console.error("[desktop-db] init failed:", e);
  }
  await createMainWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (syncWorkerStop) {
    try {
      syncWorkerStop();
    } catch {
      // ignore
    }
  }
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) await createMainWindow();
});

ipcMain.handle("device:getInfo", async () => {
  const { userData, dataDir, backupDir, logsDir } = getAppPaths();
  return {
    deviceId: cachedDeviceId ?? getDeviceFingerprint(),
    userData,
    dataDir,
    backupDir,
    logsDir,
    platform: process.platform,
    arch: process.arch,
  };
});

ipcMain.handle("license:getCurrent", async () => {
  if (!desktopDb) return { ok: false, message: "Database desktop belum siap." };
  const deviceId = cachedDeviceId ?? getDeviceFingerprint();
  const row = await getCurrentLicense(desktopDb);
  if (!row) return { ok: true, data: { license: null } };

  let payload = null as null | unknown;
  let valid = null as null | { ok: boolean; reason?: string };
  if (row.encryptedPayload) {
    try {
      const p = decryptStoredLicense({ deviceId, encryptedPayload: row.encryptedPayload });
      payload = p;
      valid = isLicenseValidNow(p);
    } catch (e) {
      valid = { ok: false, reason: e instanceof Error ? e.message : "Gagal decrypt lisensi." };
    }
  }

  return { ok: true, data: { license: row, payload, valid } };
});

ipcMain.handle("sync:getStatus", async () => {
  if (!desktopDb) return { ok: false, message: "Database desktop belum siap." };
  try {
    const status = await getSyncQueueStatus(desktopDb);
    return { ok: true, data: status };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal membaca status sync." };
  }
});

ipcMain.handle(
  "license:activateTrial",
  async (_evt: unknown, input: { companyName: string; ownerName: string; email: string; phone: string; days: number }) => {
    if (!desktopDb) return { ok: false, message: "Database desktop belum siap." };
    const deviceId = cachedDeviceId ?? getDeviceFingerprint();
    const days = Math.max(1, Math.min(30, Math.floor(Number(input.days) || 14)));
    const expires = new Date();
    expires.setDate(expires.getDate() + days);

    const res = await activateLicenseOffline({
      db: desktopDb,
      deviceId,
      input: {
        licenseKey: `TRIAL-${deviceId.slice(0, 10)}-${Date.now()}`,
        companyName: String(input.companyName ?? "").trim() || "Trial Company",
        ownerName: String(input.ownerName ?? "").trim() || "Owner",
        email: String(input.email ?? "").trim() || "trial@example.com",
        phone: String(input.phone ?? "").trim() || "-",
        expiredDate: expires.toISOString(),
        maxUsers: 3,
        maxBranches: 1,
        planType: "TRIAL",
        offlineGraceDays: 3,
      },
    });

    return { ok: true, data: res };
  },
);

ipcMain.handle("license:clear", async () => {
  if (!desktopDb) return { ok: false, message: "Database desktop belum siap." };
  try {
    await desktopDb.execute("DELETE FROM License");
    return { ok: true, data: { ok: true } };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal menghapus lisensi." };
  }
});

ipcMain.handle("license:activateKey", async (_evt: unknown, input: { serial: string }) => {
  if (!desktopDb) return { ok: false, message: "Database desktop belum siap." };
  const serial = String(input?.serial ?? "").trim();
  if (serial.length < 6) return { ok: false, message: "Serial number tidak valid." };

  const deviceId = cachedDeviceId ?? getDeviceFingerprint();

  const explicit = process.env.DESKTOP_LICENSE_ENDPOINT?.trim();
  const rendererUrl = process.env.ELECTRON_RENDERER_URL?.trim();
  const endpoint =
    explicit ||
    (rendererUrl && rendererUrl.startsWith("http") ? new URL("/api/desktop/license/activate", rendererUrl).toString() : null);

  if (!endpoint) {
    return {
      ok: false,
      message: "Endpoint aktivasi lisensi belum dikonfigurasi. Set `DESKTOP_LICENSE_ENDPOINT` ke URL server (contoh: https://domainmu.com/api/desktop/license/activate).",
    };
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ serial, deviceId }),
    });
    const json = (await res.json().catch(() => null)) as unknown;
    const ok = typeof json === "object" && json !== null && (json as { ok?: unknown }).ok === true;
    if (!res.ok || !ok) {
      const msg =
        typeof json === "object" && json !== null && typeof (json as { message?: unknown }).message === "string"
          ? (json as { message: string }).message
          : `Aktivasi gagal (${res.status}).`;
      return { ok: false, message: msg };
    }

    const payload = (json as { data?: { payload?: Record<string, unknown> } }).data?.payload ?? null;
    if (!payload || typeof payload !== "object") {
      return { ok: false, message: "Respon lisensi tidak valid." };
    }

    const expires = payload.expiredDate ? new Date(String(payload.expiredDate)) : null;
    const inputForStore = {
      licenseKey: String(payload.licenseKey ?? serial).trim() || serial,
      tenantId: payload.tenantId ? String(payload.tenantId) : null,
      companyName: String(payload.companyName ?? "").trim() || "POS Desktop",
      ownerName: String(payload.ownerName ?? "").trim() || "",
      email: String(payload.email ?? "").trim() || "",
      phone: String(payload.phone ?? "").trim() || "",
      expiredDate: expires && Number.isFinite(expires.getTime()) ? expires.toISOString() : null,
      maxUsers: Number(payload.maxUsers ?? 0) || 0,
      maxBranches: Number(payload.maxBranches ?? 0) || 0,
      planType: String(payload.planType ?? "trial"),
      offlineGraceDays: Number(payload.offlineGraceDays ?? 3) || 3,
    };

    const saved = await activateLicenseOffline({ db: desktopDb, deviceId, input: inputForStore });
    return { ok: true, data: saved };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal aktivasi lisensi." };
  }
});

// Global error handling: don't crash with a blocking dialog in production.
process.on("uncaughtException", (err) => {
  // eslint-disable-next-line no-console
  console.error("[electron] uncaughtException:", err);
  if (mainWindow) {
    void mainWindow.loadURL(
      fallbackHtml({
        title: "A JavaScript error occurred in the main process",
        message: "Terjadi error di proses utama. Silakan restart aplikasi atau hubungi support.",
        details: err && typeof (err as { stack?: unknown }).stack === "string" ? String((err as { stack: string }).stack) : String(err),
      }),
    );
  }
});

process.on("unhandledRejection", (reason) => {
  // eslint-disable-next-line no-console
  console.error("[electron] unhandledRejection:", reason);
  if (mainWindow) {
    void mainWindow.loadURL(
      fallbackHtml({
        title: "Unhandled Promise Rejection",
        message: "Terjadi error async di proses utama.",
        details: reason instanceof Error ? reason.stack || reason.message : String(reason),
      }),
    );
  }
});
