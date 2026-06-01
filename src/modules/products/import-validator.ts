import { z } from "zod";

const boolish = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((v) => {
    if (typeof v === "boolean") return v;
    const s = String(v ?? "").trim().toLowerCase();
    if (!s) return undefined;
    if (["1", "true", "yes", "y"].includes(s)) return true;
    if (["0", "false", "no", "n"].includes(s)) return false;
    return undefined;
  });

export const importRowSchema = z.object({
  name: z.string().trim().min(2).max(200),
  sku: z.string().trim().min(1).max(50),
  barcode: z.string().trim().max(100).optional().or(z.literal("")).transform((v) => (v && v.trim() ? v.trim() : null)),
  qrCode: z.string().trim().max(100).optional().or(z.literal("")).transform((v) => (v && v.trim() ? v.trim() : null)),
  productType: z
    .enum(["SINGLE", "VARIANT", "BUNDLE", "SERVICE", "DIGITAL", "ASSEMBLY"])
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : "SINGLE")),
  category: z.string().trim().min(1).max(120),
  brand: z.string().trim().min(1).max(120),
  supplier: z.string().trim().min(1).max(160),
  unit: z.string().trim().min(1).max(50),
  purchasePrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  stock: z.coerce.number().min(0),
  minimumStock: z.coerce.number().min(0),
  reorderPoint: z.coerce.number().min(0).optional(),
  weight: z.coerce.number().min(0).optional(),
  volume: z.coerce.number().min(0).optional(),
  expiredDate: z
    .union([z.date(), z.string()])
    .optional()
    .transform((v) => {
      if (!v) return null;
      if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
      const s = String(v).trim();
      if (!s) return null;
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) return null;
      return d;
    }),
  batchNumber: z.string().trim().max(120).optional().or(z.literal("")).transform((v) => (v && v.trim() ? v.trim() : null)),
  description: z.string().optional().or(z.literal("")).transform((v) => (String(v ?? "").trim() ? String(v).trim() : null)),
  tax: z.coerce.number().optional(),
  margin: z.coerce.number().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")).transform((v) => (v && v.trim() ? v.trim() : null)),
  isActive: boolish,
  isFeatured: boolish,
  isConsignment: boolish,
});

export type ImportRow = z.infer<typeof importRowSchema>;

export function validateImportRows(rows: Array<Record<string, unknown>>) {
  const parsed: Array<{ ok: true; data: ImportRow } | { ok: false; error: string; row: Record<string, unknown> }> = [];
  for (const row of rows) {
    const res = importRowSchema.safeParse(row);
    if (res.success) parsed.push({ ok: true, data: res.data });
    else parsed.push({ ok: false, error: res.error.issues.map((i) => i.message).join("; "), row });
  }
  return parsed;
}
