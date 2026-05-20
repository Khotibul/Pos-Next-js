import { z } from "zod";

export const upsertBranchCategorySchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1, "Nama wajib diisi.").max(60, "Maksimal 60 karakter."),
});

export type UpsertBranchCategoryInput = z.infer<typeof upsertBranchCategorySchema>;

