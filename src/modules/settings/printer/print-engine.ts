import type { PrinterSettings } from "@/modules/settings/printer/validators";

export type PaperProfile = {
  key: "48mm" | "58mm" | "80mm" | "custom";
  widthMm: number;
  widthPx: number;
  charsPerLine: number;
  logoMaxWidthPx: number;
  qrSizePx: number;
  barcodeWidthPx: number;
};

export type ReceiptDensity = {
  key: "compact" | "standard" | "detailed";
  paddingMm: number;
  sectionGapPx: number;
  itemGapPx: number;
  lineHeight: number;
  footerFeedLines: number;
};

export type ReceiptStoreInfo = {
  storeName?: string | null;
  storeAddress?: string | null;
  storePhone?: string | null;
};

export const PAPER_PROFILES: Record<"48mm" | "58mm" | "80mm", PaperProfile> = {
  "48mm": { key: "48mm", widthMm: 48, widthPx: 384, charsPerLine: 24, logoMaxWidthPx: 120, qrSizePx: 80, barcodeWidthPx: 150 },
  "58mm": { key: "58mm", widthMm: 58, widthPx: 384, charsPerLine: 32, logoMaxWidthPx: 150, qrSizePx: 100, barcodeWidthPx: 200 },
  "80mm": { key: "80mm", widthMm: 80, widthPx: 576, charsPerLine: 48, logoMaxWidthPx: 200, qrSizePx: 120, barcodeWidthPx: 250 },
};

export const RECEIPT_DENSITY: Record<"compact" | "standard" | "detailed", ReceiptDensity> = {
  compact: { key: "compact", paddingMm: 1, sectionGapPx: 2, itemGapPx: 0, lineHeight: 1.1, footerFeedLines: 0 },
  standard: { key: "standard", paddingMm: 2, sectionGapPx: 3, itemGapPx: 1, lineHeight: 1, footerFeedLines: 0 },
  detailed: { key: "detailed", paddingMm: 2, sectionGapPx: 2, itemGapPx: 1, lineHeight: 1, footerFeedLines: 0 },
};

export const FONT_SCALE: Record<"small" | "medium" | "large", number> = {
  small: 0.92,
  medium: 1,
  large: 1.12,
};

export function getPaperProfile(settings: PrinterSettings): PaperProfile {
  if (settings.paper !== "custom") return PAPER_PROFILES[settings.paper];

  const widthMm = settings.customWidthMm ?? 58;
  const widthPx = Math.max(220, Math.round(widthMm * 7.2) + (settings.printWidthAdjustmentPx ?? 0));

  return {
    key: "custom",
    widthMm,
    widthPx,
    charsPerLine: Math.max(16, Math.round(widthMm * 0.55)),
    logoMaxWidthPx: Math.min(200, Math.max(90, Math.round(widthPx * 0.38))),
    qrSizePx: Math.min(120, Math.max(76, Math.round(widthPx * 0.22))),
    barcodeWidthPx: Math.min(250, Math.max(140, Math.round(widthPx * 0.42))),
  };
}

export function getReceiptDensity(settings: PrinterSettings): ReceiptDensity {
  return RECEIPT_DENSITY[settings.receiptMode ?? "standard"];
}

export function getBaseFontPx(settings: PrinterSettings, profile = getPaperProfile(settings)) {
  const scale = FONT_SCALE[settings.receiptFontSize ?? "medium"] ?? 1;
  const base = profile.key === "80mm" ? 12 : profile.key === "48mm" ? 10.5 : 11;
  return Math.max(9, Math.round(base * scale * 10) / 10);
}

export function getTitleFontPx(settings: PrinterSettings, profile = getPaperProfile(settings)) {
  const scale = FONT_SCALE[settings.receiptFontSize ?? "medium"] ?? 1;
  const base = profile.key === "80mm" ? 14 : 13;
  return Math.max(11, Math.round(base * scale * 10) / 10);
}

export function sanitizeReceiptText(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

export function truncateText(input: string, maxLength: number) {
  const text = sanitizeReceiptText(input);
  if (text.length <= maxLength) return text;
  if (maxLength <= 3) return text.slice(0, maxLength);
  return `${text.slice(0, maxLength - 3)}...`;
}

export function wrapText(input: string, maxLength: number) {
  const text = sanitizeReceiptText(input);
  if (!text) return [];

  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length <= maxLength) {
      current = next;
      continue;
    }

    if (current) lines.push(current);

    current = word.length > maxLength ? truncateText(word, maxLength) : word;
  }

  if (current) lines.push(current);

  return lines;
}

export function centerText(input: string, width: number) {
  const text = truncateText(input, width);

  if (text.length >= width) return text;

  const left = Math.floor((width - text.length) / 2);
  const right = Math.max(0, width - text.length - left);

  return `${" ".repeat(Math.max(0, left))}${text}${" ".repeat(right)}`;
}

export function centerWrappedText(input: string | null | undefined, width: number) {
  const text = sanitizeReceiptText(String(input ?? ""));

  if (!text) return [];

  return wrapText(text, width).map((line) => centerText(line, width));
}

export function leftRightText(leftText: string, rightText: string, width: number) {
  const left = truncateText(leftText, Math.floor(width * 0.6));
  const right = truncateText(rightText, Math.floor(width * 0.4));
  const space = Math.max(1, width - left.length - right.length);

  return `${left}${" ".repeat(space)}${right}`;
}

export function separator(width: number, char = "-") {
  return char.repeat(width);
}

export function trimReceiptEnd(text: string) {
  return text.replace(/\n+$/g, "\n");
}

export function buildReceiptHeaderLines(settings: PrinterSettings, store: ReceiptStoreInfo) {
  const profile = getPaperProfile(settings);
  const width = profile.charsPerLine;

  const lines: string[] = [];

  lines.push(...centerWrappedText(store.storeName || "POS PRO", width));
  lines.push(...centerWrappedText(store.storeAddress, width));

  if (store.storePhone) {
    lines.push(...centerWrappedText(`Telp: ${store.storePhone}`, width));
  }

  lines.push(separator(width));

  return lines;
}

export function formatReceiptAmount(value: number) {
  return value.toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

export function formatReceiptCurrency(value: number) {
  return `Rp ${formatReceiptAmount(value)}`;
}