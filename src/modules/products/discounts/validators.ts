import { z } from "zod";

const DISCOUNT_TYPES = ["AMOUNT", "PERCENT", "BOGO", "BUNDLE"] as const;

export const upsertProductDiscountSchema = z
  .object({
    id: z.string().optional(),
    branchId: z.string().optional().or(z.literal("")).transform((v) => (v && v.trim() ? v.trim() : null)),
    type: z.enum(DISCOUNT_TYPES).default("PERCENT"),
    productId: z.string().optional().or(z.literal("")).transform((v) => (v && v.trim() ? v.trim() : null)),
    bundleId: z.string().optional().or(z.literal("")).transform((v) => (v && v.trim() ? v.trim() : null)),
    value: z.coerce.number().min(0).default(0),
    buyQty: z.coerce.number().int().min(1).optional(),
    getQty: z.coerce.number().int().min(1).optional(),
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
  .superRefine((v, ctx) => {
    if (v.type === "PERCENT" && (v.value < 0 || v.value > 100)) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "Diskon persen harus 0-100." });
    }
    if (v.type === "BOGO") {
      if (!v.productId) ctx.addIssue({ code: "custom", path: ["productId"], message: "BOGO wajib pilih produk." });
      if (!v.buyQty || !v.getQty) ctx.addIssue({ code: "custom", path: ["buyQty"], message: "BOGO wajib isi buyQty & getQty." });
    }
    if (v.type === "BUNDLE" && !v.bundleId) {
      ctx.addIssue({ code: "custom", path: ["bundleId"], message: "Bundle promo wajib pilih bundle." });
    }
    if ((v.type === "AMOUNT" || v.type === "PERCENT") && !v.productId) {
      ctx.addIssue({ code: "custom", path: ["productId"], message: "Diskon produk wajib pilih produk." });
    }
    if ((!v.startsAt && v.endsAt) || (v.startsAt && v.endsAt && v.startsAt > v.endsAt)) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Periode promo tidak valid." });
    }
  });

export type UpsertProductDiscountInput = z.infer<typeof upsertProductDiscountSchema>;

