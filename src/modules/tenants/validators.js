import { z } from "zod";

export const createTenantFromOnboardingSchema = z.object({
  tenantName: z.string().trim().min(2).max(120).optional(),
  serial: z.string().trim().min(6).max(80).optional(),
  planSlug: z.string().trim().min(2).max(40).optional(),
});
