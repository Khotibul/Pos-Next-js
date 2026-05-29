import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { SqliteDb } from "../db/sqlite.js";
import { defaultDesktopSqlitePath } from "../db/connection.js";
import { deriveKey, encryptJson, decryptJson, sha256Hex, type EncryptedBlob } from "./crypto.js";

export type LicensePayload = {
  licenseKey: string;
  tenantId?: string | null;
  companyName: string;
  ownerName: string;
  email: string;
  phone: string;
  deviceId: string;
  activationDate: string;
  expiredDate: string | null;
  maxUsers: number;
  maxBranches: number;
  planType: string;
  offlineGraceDays: number;
};

function id32() {
  return crypto.randomBytes(16).toString("hex");
}

export async function openDesktopDb(params: { userDataDir: string }) {
  const dbPath = defaultDesktopSqlitePath(params.userDataDir);
  // Keep folder for license exports/backups.
  fs.mkdirSync(path.join(params.userDataDir, "license"), { recursive: true });
  return SqliteDb.openOrCreate({ dbPath });
}

export async function getCurrentLicense(db: SqliteDb) {
  const rows = await db.query<Record<string, unknown>>("SELECT * FROM License ORDER BY updatedAt DESC LIMIT 1");
  if (rows.length === 0) return null;
  const r = rows[0]!;
  return {
    id: String(r.id),
    tenantId: r.tenantId == null ? null : String(r.tenantId),
    licenseKey: r.licenseKey == null ? null : String(r.licenseKey),
    companyName: r.companyName == null ? null : String(r.companyName),
    ownerName: r.ownerName == null ? null : String(r.ownerName),
    email: r.email == null ? null : String(r.email),
    phone: r.phone == null ? null : String(r.phone),
    deviceId: r.deviceId == null ? null : String(r.deviceId),
    activationDate: r.activationDate ? new Date(String(r.activationDate)).toISOString() : null,
    expiredDate: r.expiredDate ? new Date(String(r.expiredDate)).toISOString() : null,
    maxUsers: r.maxUsers == null ? 0 : Number(r.maxUsers),
    maxBranches: r.maxBranches == null ? 0 : Number(r.maxBranches),
    planType: r.planType == null ? "" : String(r.planType),
    isActive: Boolean(Number(r.isActive ?? 0)),
    lastValidationAt: r.lastValidationAt ? new Date(String(r.lastValidationAt)).toISOString() : null,
    offlineGraceDays: r.offlineGraceDays == null ? 0 : Number(r.offlineGraceDays),
    signatureHash: r.signatureHash == null ? null : String(r.signatureHash),
    encryptedPayload: r.encryptedPayload == null ? null : String(r.encryptedPayload),
  };
}

export async function activateLicenseOffline(params: {
  db: SqliteDb;
  deviceId: string;
  input: Omit<LicensePayload, "deviceId" | "activationDate">;
}) {
  const activationDate = new Date().toISOString();
  const payload: LicensePayload = {
    ...params.input,
    deviceId: params.deviceId,
    activationDate,
  };

  // Device-bound encryption key
  const salt = "pos-desktop-enterprise:v1";
  const key = deriveKey({ deviceId: params.deviceId, salt });
  const blob = encryptJson({ key, payload });
  const encryptedPayload = JSON.stringify(blob);
  const signatureHash = sha256Hex(encryptedPayload);

  const now = new Date().toISOString();
  const id = id32();

  await params.db.execute(
    `INSERT INTO License (
      id, tenantId, licenseKey, companyName, ownerName, email, phone, deviceId,
      activationDate, expiredDate, maxUsers, maxBranches, planType, isActive,
      lastValidationAt, offlineGraceDays, signatureHash, encryptedPayload, createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )`,
    [
      id,
      payload.tenantId ?? null,
      payload.licenseKey,
      payload.companyName,
      payload.ownerName,
      payload.email,
      payload.phone,
      payload.deviceId,
      now,
      payload.expiredDate,
      payload.maxUsers,
      payload.maxBranches,
      payload.planType,
      1,
      now,
      payload.offlineGraceDays,
      signatureHash,
      encryptedPayload,
      now,
      now,
    ],
  );

  return { id };
}

export function decryptStoredLicense(params: { deviceId: string; encryptedPayload: string }) {
  const blob = JSON.parse(params.encryptedPayload) as EncryptedBlob;
  const key = deriveKey({ deviceId: params.deviceId, salt: "pos-desktop-enterprise:v1" });
  return decryptJson<LicensePayload>({ key, blob });
}

export function isLicenseValidNow(payload: LicensePayload) {
  if (!payload.licenseKey) return { ok: false, reason: "License key kosong." };
  if (!payload.deviceId) return { ok: false, reason: "Device binding tidak valid." };
  if (payload.expiredDate) {
    const exp = new Date(payload.expiredDate);
    if (!Number.isFinite(exp.getTime())) return { ok: false, reason: "Expired date tidak valid." };
    if (Date.now() > exp.getTime()) return { ok: false, reason: "Lisensi sudah expired." };
  }
  return { ok: true as const };
}

export function writeLicenseExport(params: { filePath: string; payload: LicensePayload }) {
  fs.mkdirSync(path.dirname(params.filePath), { recursive: true });
  fs.writeFileSync(params.filePath, JSON.stringify(params.payload, null, 2), "utf8");
}
