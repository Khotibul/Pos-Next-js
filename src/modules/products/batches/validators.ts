import { z } from "zod";

export const upsertProductBatchSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1),
  batchNumber: z.string().trim().max(120).optional().or(z.literal("")).transform((v) => (v && v.trim() ? v.trim() : null)),
  expiredDate: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => {
      const s = String(v ?? "").trim();
      if (!s) return null;
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) return null;
      return d;
    }),
  quantity: z.coerce.number().min(0).default(0),
  costPrice: z.coerce.number().min(0).default(0),
  source: z
    .enum(["MANUAL", "OCR_PHOTO", "IMPORT", "PURCHASE"])
    .optional()
    .transform((v) => v ?? "MANUAL"),
  photoUrl: z.string().url().optional().or(z.literal("")).transform((v) => (v && v.trim() ? v.trim() : null)),
  ocrText: z.string().optional().or(z.literal("")).transform((v) => (String(v ?? "").trim() ? String(v).trim() : null)),
  confidence: z.coerce.number().min(0).max(1).optional(),
});

export type UpsertProductBatchInput = z.infer<typeof upsertProductBatchSchema>;
