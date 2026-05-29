import crypto from "node:crypto";

export type EncryptedBlob = {
  alg: "aes-256-gcm";
  iv: string; // base64url
  tag: string; // base64url
  data: string; // base64url
};

function b64u(buf: Buffer) {
  return buf.toString("base64url");
}

function fromB64u(s: string) {
  return Buffer.from(s, "base64url");
}

export function deriveKey(params: { deviceId: string; salt: string }) {
  // Derive a stable key per device.
  return crypto.scryptSync(params.deviceId, params.salt, 32);
}

export function encryptJson(params: { key: Buffer; payload: unknown }): EncryptedBlob {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", params.key, iv);
  const json = Buffer.from(JSON.stringify(params.payload), "utf8");
  const enc = Buffer.concat([cipher.update(json), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { alg: "aes-256-gcm", iv: b64u(iv), tag: b64u(tag), data: b64u(enc) };
}

export function decryptJson<T>(params: { key: Buffer; blob: EncryptedBlob }): T {
  const iv = fromB64u(params.blob.iv);
  const tag = fromB64u(params.blob.tag);
  const data = fromB64u(params.blob.data);
  const decipher = crypto.createDecipheriv("aes-256-gcm", params.key, iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(out.toString("utf8")) as T;
}

export function sha256Hex(data: string) {
  return crypto.createHash("sha256").update(data).digest("hex");
}
