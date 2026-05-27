import { z } from "zod";

const PRICE_TYPES = ["RETAIL", "WHOLESALE", "RESELLER", "MEMBER"] as const;

export const upsertProductPriceSchema = z
  .object({
    id: z.string().optional(),
    productId: z.string().min(1),
    branchId: z.string().optional().or(z.literal("")).transform((v) => (v && v.trim() ? v.trim() : null)),
    priceType: z.enum(PRICE_TYPES).default("RETAIL"),
    price: z.coerce.number().min(0),
    startsAt: z
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
    endsAt: z
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
    isActive: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((v) => {
        if (typeof v === "boolean") return v;
        const s = String(v ?? "").trim().toLowerCase();
        if (!s) return undefined;
        if (["1", "true", "yes", "y", "on"].includes(s)) return true;
        if (["0", "false", "no", "n", "off"].includes(s)) return false;
        return undefined;
      }),
  })
  .refine((v) => (!v.startsAt && !v.endsAt) || (v.startsAt && v.endsAt && v.startsAt <= v.endsAt), {
    message: "Tanggal promo tidak valid.",
    path: ["endsAt"],
  });

export type UpsertProductPriceInput = z.infer<typeof upsertProductPriceSchema>;

