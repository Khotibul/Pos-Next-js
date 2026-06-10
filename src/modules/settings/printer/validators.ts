import { z } from "zod";

export const PrinterPaperSchema = z.enum(["48mm", "58mm", "80mm", "custom"]);
export const PrinterConnectionTypeSchema = z.enum(["browser", "bluetooth"]);

export const PrinterSettingsSchema = z.object({
  connectionType: PrinterConnectionTypeSchema.default("browser"),
  bluetoothDeviceName: z.string().optional().default(""),
  defaultBrowserPrinter: z.string().optional().default(""),
  paper: PrinterPaperSchema.default("80mm"),
  customWidthMm: z.number().min(10).max(200).optional().default(58),
  customHeightMm: z.number().min(10).max(500).optional().default(150),
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
  receiptFontSize: z.enum(["small", "medium", "large"]).default("medium"),
});

export type PrinterSettings = z.infer<typeof PrinterSettingsSchema>;

export const UpdatePrinterSettingsFormSchema = z.object({
  connectionType: PrinterConnectionTypeSchema.optional().default("browser"),
  bluetoothDeviceName: z.string().trim().optional(),
  paper: PrinterPaperSchema,
  customWidthMm: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => (v === undefined || v === "" ? undefined : typeof v === "number" ? v : Number(v)))
    .pipe(z.number().min(10).max(200).optional()),
  customHeightMm: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => (v === undefined || v === "" ? undefined : typeof v === "number" ? v : Number(v)))
    .pipe(z.number().min(10).max(500).optional()),
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
  receiptFontSize: z.enum(["small", "medium", "large"]).optional().default("medium"),
});

export type UpdatePrinterSettingsForm = z.infer<typeof UpdatePrinterSettingsFormSchema>;
