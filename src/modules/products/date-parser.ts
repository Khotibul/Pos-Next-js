export type ParsedExpired = {
  expiredDate: Date | null;
  batchNumber: string | null;
  rawText: string;
  matched: string | null;
  confidenceHint: number | null;
};

const MONTHS: Record<string, number> = {
  jan: 0,
  januari: 0,
  feb: 1,
  februari: 1,
  mar: 2,
  maret: 2,
  apr: 3,
  april: 3,
  mei: 4,
  may: 4,
  jun: 5,
  juni: 5,
  jul: 6,
  juli: 6,
  aug: 7,
  ags: 7,
  agustus: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  okt: 9,
  oktober: 9,
  nov: 10,
  november: 10,
  dec: 11,
  des: 11,
  desember: 11,
};

function endOfMonth(year: number, month0: number) {
  return new Date(year, month0 + 1, 0, 12, 0, 0);
}

function twoDigitYearToFull(y: number) {
  if (y >= 100) return y;
  // assume 2000..2099
  return 2000 + y;
}

function isValidDate(d: Date) {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

function pickBatchNumber(text: string): string | null {
  const t = text.replace(/\s+/g, " ");
  const patterns = [
    /\b(batch|lot|bn|no\.?\s*batch|batch\s*no|lot\s*no)\s*[:#]?\s*([A-Z0-9][A-Z0-9\-_.\/]{2,30})\b/i,
    /\b([A-Z0-9][A-Z0-9\-_.\/]{5,30})\b\s*(batch|lot)\b/i,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (!m) continue;
    const candidate = (m[2] ?? m[1] ?? "").trim();
    if (candidate.length >= 3) return candidate;
  }
  return null;
}

function parseNumericDate(d: number, m: number, y: number): Date | null {
  const year = twoDigitYearToFull(y);
  const date = new Date(year, m - 1, d, 12, 0, 0);
  if (!isValidDate(date)) return null;
  // basic sanity check
  if (date.getFullYear() !== year || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

function extractCandidates(text: string): Array<{ raw: string; date: Date; hint: number }> {
  const t = text
    .replace(/\u00A0/g, " ")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const out: Array<{ raw: string; date: Date; hint: number }> = [];

  // YYYY-MM-DD
  for (const m of t.matchAll(/\b(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})\b/g)) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const date = parseNumericDate(d, mo, y);
    if (date) out.push({ raw: m[0], date, hint: 0.95 });
  }

  // DD/MM/YYYY or DD-MM-YYYY
  for (const m of t.matchAll(/\b(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})\b/g)) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const y = Number(m[3]);
    const date = parseNumericDate(d, mo, y);
    if (date) out.push({ raw: m[0], date, hint: m[3].length === 2 ? 0.75 : 0.9 });
  }

  // EXP 12/2026 or 12-2026 (month/year) -> end of month
  for (const m of t.matchAll(/\b(\d{1,2})[-\/](20\d{2})\b/g)) {
    const mo = Number(m[1]);
    const y = Number(m[2]);
    if (mo >= 1 && mo <= 12) out.push({ raw: m[0], date: endOfMonth(y, mo - 1), hint: 0.7 });
  }

  // 31 Dec 2026 / 31 Des 2026 / 31 Oktober 2026
  for (const m of t.matchAll(/\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d{2})\b/g)) {
    const d = Number(m[1]);
    const monName = m[2]?.toLowerCase() ?? "";
    const y = Number(m[3]);
    const mo0 = MONTHS[monName];
    if (typeof mo0 !== "number") continue;
    const date = new Date(y, mo0, d, 12, 0, 0);
    if (isValidDate(date)) out.push({ raw: m[0], date, hint: 0.85 });
  }

  // 250526 (ddmmyy)
  for (const m of t.matchAll(/\b(\d{6})\b/g)) {
    const raw = m[1] ?? "";
    const dd = Number(raw.slice(0, 2));
    const mm = Number(raw.slice(2, 4));
    const yy = Number(raw.slice(4, 6));
    const date = parseNumericDate(dd, mm, yy);
    if (date) out.push({ raw, date, hint: 0.6 });
  }

  return out;
}

export function parseExpiredFromText(text: string): ParsedExpired {
  const rawText = String(text ?? "");
  const upper = rawText.toUpperCase();
  const batchNumber = pickBatchNumber(upper);

  const candidates = extractCandidates(upper);
  if (candidates.length === 0) {
    return { expiredDate: null, batchNumber, rawText, matched: null, confidenceHint: null };
  }

  // Prefer candidates near keywords EXP/EXPIRED/BB/ED
  const keywordPos = (() => {
    const keys = ["EXP", "EXPIRED", "BEST BEFORE", "BB", "ED"];
    let best = -1;
    for (const k of keys) {
      const i = upper.indexOf(k);
      if (i >= 0) {
        best = best < 0 ? i : Math.min(best, i);
      }
    }
    return best;
  })();

  const scored = candidates.map((c) => {
    let score = c.hint;
    if (keywordPos >= 0) {
      const pos = upper.indexOf(c.raw.toUpperCase());
      if (pos >= 0) {
        const dist = Math.abs(pos - keywordPos);
        score += dist <= 30 ? 0.1 : dist <= 80 ? 0.03 : 0;
      }
    }
    return { ...c, score };
  });

  scored.sort((a, b) => b.score - a.score || a.date.getTime() - b.date.getTime());
  const best = scored[0]!;

  return { expiredDate: best.date, batchNumber, rawText, matched: best.raw, confidenceHint: Math.min(0.99, best.score) };
}

