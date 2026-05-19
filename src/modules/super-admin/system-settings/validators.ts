import { z } from "zod";

export const upsertGlobalSettingSchema = z.object({
  id: z.string().min(5).optional(),
  key: z.string().trim().min(2).max(120),
  valueJson: z.string().trim().min(2).max(10000),
});

export type UpsertGlobalSettingInput = z.infer<typeof upsertGlobalSettingSchema>;

