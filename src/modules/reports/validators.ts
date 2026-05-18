import { z } from "zod";

export const ReportRangePresetSchema = z.enum(["today", "7d", "month", "custom"]);

export const SalesReportQuerySchema = z.object({
  preset: ReportRangePresetSchema.default("7d"),
  // Accept ISO datetime or YYYY-MM-DD (date-only)
  from: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isNaN(Date.parse(v)), "Invalid from"),
  to: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isNaN(Date.parse(v)), "Invalid to"),
  q: z.string().trim().min(1).max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type SalesReportQuery = z.infer<typeof SalesReportQuerySchema>;
