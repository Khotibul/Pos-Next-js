import { z } from "zod";

export const upsertProductCategorySchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1, "Nama wajib diisi.").max(60, "Maksimal 60 karakter."),
  description: z.string().trim().max(240).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  icon: z.string().trim().max(40).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  color: z.string().trim().max(20).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  isActive: z.union([z.boolean(), z.string()]).optional().transform((v) => (typeof v === "boolean" ? v : v === "on" ? true : v === "true" ? true : false)),
});

export type UpsertProductCategoryInput = z.infer<typeof upsertProductCategorySchema>;
