import { z } from "zod";

export const updateSubscriptionSchema = z.object({
  tenantId: z.string().min(1),
  planId: z.string().optional(),
  status: z.enum(["ACTIVE", "TRIAL", "SUSPENDED", "EXPIRED"]),
  trialEndsAt: z.string().optional(),
});

export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
