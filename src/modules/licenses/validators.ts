import { z } from "zod";

export const redeemLicenseSchema = z.object({
  serial: z.string().trim().min(6, "Serial number wajib diisi.").max(80),
});

export type RedeemLicenseInput = z.infer<typeof redeemLicenseSchema>;

export const generateLicenseSchema = z.object({
  planSlug: z.string().trim().min(2).max(40).default("pro"),
  qty: z.coerce.number().int().min(1).max(200).default(1),
  expiresAt: z.string().trim().optional().or(z.literal("")),
});

export type GenerateLicenseInput = z.infer<typeof generateLicenseSchema>;

