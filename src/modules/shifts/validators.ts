import { z } from "zod";

export const openShiftSchema = z.object({
  openingCash: z.coerce.number().min(0).max(1_000_000_000).default(0),
  note: z.string().trim().max(300).optional().or(z.literal("")),
});

export const closeShiftSchema = z.object({
  id: z.string().min(5),
  closingCash: z.coerce.number().min(0).max(1_000_000_000).default(0),
  note: z.string().trim().max(300).optional().or(z.literal("")),
});

export type OpenShiftInput = z.infer<typeof openShiftSchema>;
export type CloseShiftInput = z.infer<typeof closeShiftSchema>;

