import { z } from "zod";

export const upsertCustomerSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(120),
  email: z
    .string()
    .trim()
    .email("Email tidak valid.")
    .max(160)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  phone: z
    .string()
    .trim()
    .min(6, "Nomor telepon terlalu pendek.")
    .max(40)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  address: z
    .string()
    .trim()
    .max(240)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  isActive: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => (typeof v === "boolean" ? v : v === "on" ? true : v === "true" ? true : false)),
});

export type UpsertCustomerInput = z.infer<typeof upsertCustomerSchema>;

