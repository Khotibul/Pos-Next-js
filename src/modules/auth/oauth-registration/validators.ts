import { z } from "zod";

export const createOauthRegistrationSchema = z.object({
  tenantName: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(32).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  planSlug: z.string().trim().min(2).max(40).optional(),
});

export type CreateOauthRegistrationInput = z.infer<typeof createOauthRegistrationSchema>;

