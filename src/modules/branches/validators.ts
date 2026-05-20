import { z } from "zod";

export const upsertBranchSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(2, "Nama wajib diisi.").max(120, "Maksimal 120 karakter."),
  code: z.string().trim().max(40, "Maksimal 40 karakter.").optional().or(z.literal("")),
  categoryId: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  isActive: z.coerce.boolean().optional().default(true),
});

export type UpsertBranchInput = z.infer<typeof upsertBranchSchema>;

