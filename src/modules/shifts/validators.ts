import { z } from "zod";

export const openShiftSchema = z.object({
  openingCash: z.coerce.number().min(0).max(1_000_000_000).default(0),
  openNote: z.string().trim().max(500).optional().or(z.literal("")),
});

export const closeShiftSchema = z.object({
  shiftId: z.string().min(5),
  cashCounted: z.coerce.number().min(0).max(1_000_000_000).default(0),
  closeNote: z.string().trim().max(500).optional().or(z.literal("")),
});

export const approveShiftSchema = z.object({
  shiftId: z.string().min(5),
});

export type OpenShiftInput = z.infer<typeof openShiftSchema>;
export type CloseShiftInput = z.infer<typeof closeShiftSchema>;
export type ApproveShiftInput = z.infer<typeof approveShiftSchema>;
