import { z } from "zod";

export const createTenantFromOnboardingSchema = z.object({
  tenantName: z.string().min(2).max(120),
  planSlug: z.string().trim().min(2).max(40).optional(),
});

export type CreateTenantFromOnboardingInput = z.infer<typeof createTenantFromOnboardingSchema>;

