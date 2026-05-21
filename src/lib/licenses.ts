import crypto from "crypto";

export function normalizeSerial(input: string) {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatSerial(normalized: string) {
  const s = normalizeSerial(normalized);
  if (s.length <= 4) return s;
  return s.match(/.{1,4}/g)?.join("-") ?? s;
}

export function generateSerial(prefix = "PPOS") {
  // 16 chars payload + prefix => e.g. PPOS-ABCD-EFGH-IJKL-MNOP
  const payload = crypto.randomBytes(8).toString("hex").toUpperCase(); // 16 chars
  return formatSerial(`${prefix}${payload}`);
}

