import { z } from "zod";

export const tenantStatusSchema = z.enum(["ACTIVE", "TRIAL", "SUSPENDED", "EXPIRED"]);

export const upsertTenantSchema = z.object({
  id: z.string().min(5).optional(),
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(80),
  domain: z.string().trim().min(3).max(255).optional().or(z.literal("")),
  subdomain: z.string().trim().min(2).max(63).optional().or(z.literal("")),
  planId: z.string().min(5).optional().or(z.literal("")),
  status: tenantStatusSchema.optional(),
  trialEndsAt: z.string().optional().or(z.literal("")),
  suspendedAt: z.string().optional().or(z.literal("")),
});

export type UpsertTenantInput = z.infer<typeof upsertTenantSchema>;

