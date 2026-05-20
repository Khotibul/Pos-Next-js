import { z } from "zod";

export const upsertProductUnitSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1, "Nama wajib diisi.").max(60, "Maksimal 60 karakter."),
});

export type UpsertProductUnitInput = z.infer<typeof upsertProductUnitSchema>;

