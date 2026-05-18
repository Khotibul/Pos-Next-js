import { z } from "zod";

export const upsertPlanSchema = z.object({
  id: z.string().min(1).optional(),
  slug: z
    .string()
    .trim()
    .min(2, "Slug minimal 2 karakter.")
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Slug hanya boleh huruf kecil, angka, dan '-'"),
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(80),
  description: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  currency: z.string().trim().min(3).max(5).default("IDR"),
  priceMonthly: z.coerce.number().min(0).max(1000000000),
  trialDays: z.coerce.number().int().min(0).max(365),
  isPopular: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => (typeof v === "boolean" ? v : v === "on" ? true : v === "true" ? true : false)),
  isActive: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => (typeof v === "boolean" ? v : v === "on" ? true : v === "true" ? true : false)),
});

export type UpsertPlanInput = z.infer<typeof upsertPlanSchema>;

