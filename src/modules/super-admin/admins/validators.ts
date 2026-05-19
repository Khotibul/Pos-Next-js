import { z } from "zod";

export const upsertAdminSchema = z.object({
  userId: z.string().min(5).optional(),
  name: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200).optional().or(z.literal("")),
});

export type UpsertAdminInput = z.infer<typeof upsertAdminSchema>;

