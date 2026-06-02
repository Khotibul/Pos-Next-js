import { z } from "zod";

export const PrinterPaperSchema = z.enum(["58mm", "80mm"]);

export const PrinterSettingsSchema = z.object({
  paper: PrinterPaperSchema.default("80mm"),
  autoPrintAfterPayment: z.boolean().default(false),
  showLogo: z.boolean().default(false),
  headerTitle: z.string().trim().min(1).max(60).default("POS Pro"),
  headerSubtitle: z.string().trim().max(120).default(""),
  footerNote: z.string().trim().max(160).default("Terima kasih sudah berbelanja."),
  showTax: z.boolean().default(true),
  showDiscount: z.boolean().default(true),
  showSkuOnReceipt: z.boolean().default(true),
  showUnitPriceOnReceipt: z.boolean().default(true),
  cartShowSku: z.boolean().default(true),
  cartShowStock: z.boolean().default(true),
  cartShowDiscount: z.boolean().default(true),
  cartShowTax: z.boolean().default(true),
});

export type PrinterSettings = z.infer<typeof PrinterSettingsSchema>;

export const UpdatePrinterSettingsFormSchema = z.object({
  paper: PrinterPaperSchema,
  autoPrintAfterPayment: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => (typeof v === "boolean" ? v : v === "on" ? true : v === "true" ? true : false)),
  showLogo: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => (typeof v === "boolean" ? v : v === "on" ? true : v === "true" ? true : false)),
  headerTitle: z.string().trim().min(1).max(60),
  headerSubtitle: z.string().trim().max(120).optional().or(z.literal("")).transform((v) => v ?? ""),
  footerNote: z.string().trim().max(160).optional().or(z.literal("")).transform((v) => v ?? ""),
  showTax: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => (typeof v === "boolean" ? v : v === "on" ? true : v === "true" ? true : false)),
  showDiscount: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => (typeof v === "boolean" ? v : v === "on" ? true : v === "true" ? true : false)),
  showSkuOnReceipt: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => (typeof v === "boolean" ? v : v === "on" ? true : v === "true" ? true : false)),
  showUnitPriceOnReceipt: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => (typeof v === "boolean" ? v : v === "on" ? true : v === "true" ? true : false)),
  cartShowSku: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => (typeof v === "boolean" ? v : v === "on" ? true : v === "true" ? true : false)),
  cartShowStock: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => (typeof v === "boolean" ? v : v === "on" ? true : v === "true" ? true : false)),
  cartShowDiscount: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => (typeof v === "boolean" ? v : v === "on" ? true : v === "true" ? true : false)),
  cartShowTax: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => (typeof v === "boolean" ? v : v === "on" ? true : v === "true" ? true : false)),
});

export type UpdatePrinterSettingsForm = z.infer<typeof UpdatePrinterSettingsFormSchema>;
