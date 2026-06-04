import { z } from "zod";

export const CustomerDisplayThemeSchema = z.enum(["light", "dark", "brand"]);
export const CustomerDisplayLayoutSchema = z.enum(["compact", "standard", "media"]);

export const CustomerDisplaySettingsSchema = z.object({
  enabled: z.boolean().default(false),
  title: z.string().trim().min(1).max(80).default("POS Pro"),
  subtitle: z.string().trim().max(140).default("Customer Display"),
  welcomeMessage: z.string().trim().max(180).default("Selamat datang, silakan cek belanja Anda."),
  thankYouMessage: z.string().trim().max(180).default("Terima kasih sudah berbelanja."),
  idleMessage: z.string().trim().max(180).default("Transaksi siap diproses."),
  theme: CustomerDisplayThemeSchema.default("brand"),
  layout: CustomerDisplayLayoutSchema.default("standard"),
  showLogo: z.boolean().default(true),
  showItemImages: z.boolean().default(true),
  showSku: z.boolean().default(false),
  showDiscount: z.boolean().default(true),
  showTax: z.boolean().default(true),
  showPaymentMethod: z.boolean().default(true),
  showReceivedAndChange: z.boolean().default(true),
  showQueueNumber: z.boolean().default(false),
  autoOpenOnPos: z.boolean().default(false),
  secondaryScreenUrl: z.string().trim().max(240).default("/customer-display"),
});

export type CustomerDisplaySettings = z.infer<typeof CustomerDisplaySettingsSchema>;

const checkboxValue = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((value) => (typeof value === "boolean" ? value : value === "on" || value === "true"));

export const UpdateCustomerDisplaySettingsFormSchema = z.object({
  enabled: checkboxValue,
  title: z.string().trim().min(1).max(80),
  subtitle: z.string().trim().max(140).optional().or(z.literal("")).transform((value) => value ?? ""),
  welcomeMessage: z.string().trim().max(180).optional().or(z.literal("")).transform((value) => value ?? ""),
  thankYouMessage: z.string().trim().max(180).optional().or(z.literal("")).transform((value) => value ?? ""),
  idleMessage: z.string().trim().max(180).optional().or(z.literal("")).transform((value) => value ?? ""),
  theme: CustomerDisplayThemeSchema,
  layout: CustomerDisplayLayoutSchema,
  showLogo: checkboxValue,
  showItemImages: checkboxValue,
  showSku: checkboxValue,
  showDiscount: checkboxValue,
  showTax: checkboxValue,
  showPaymentMethod: checkboxValue,
  showReceivedAndChange: checkboxValue,
  showQueueNumber: checkboxValue,
  autoOpenOnPos: checkboxValue,
  secondaryScreenUrl: z.string().trim().max(240).optional().or(z.literal("")).transform((value) => value || "/customer-display"),
});

export type UpdateCustomerDisplaySettingsForm = z.infer<typeof UpdateCustomerDisplaySettingsFormSchema>;
