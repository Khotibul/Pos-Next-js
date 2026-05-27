import { z } from "zod";

export const productIdSchema = z.string().min(1);

export const productTypeSchema = z.enum(["SINGLE", "VARIANT", "BUNDLE", "SERVICE", "DIGITAL", "ASSEMBLY"]);

export const createProductSchema = z.object({
  sku: z.string().max(50).optional().or(z.literal("")),
  name: z.string().min(2).max(200),
  slug: z.string().max(200).optional().or(z.literal("")),
  description: z.string().max(5000).optional().or(z.literal("")),
  barcode: z.string().max(100).optional().or(z.literal("")),
  qrCode: z.string().max(200).optional().or(z.literal("")),
  categoryId: z.string().optional().or(z.literal("")),
  brandId: z.string().optional().or(z.literal("")),
  supplierId: z.string().optional().or(z.literal("")),
  unitId: z.string().optional().or(z.literal("")),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  marginPct: z.coerce.number().min(0).max(1000).optional(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  weight: z.coerce.number().min(0).optional(),
  volume: z.coerce.number().min(0).optional(),
  minStock: z.coerce.number().min(0).optional(),
  reorderPoint: z.coerce.number().min(0).optional(),
  isActive: z.coerce.boolean().optional().default(true),
  isFeatured: z.coerce.boolean().optional().default(false),
  isConsignment: z.coerce.boolean().optional().default(false),
  type: productTypeSchema.optional().default("SINGLE"),
});

export const updateProductSchema = createProductSchema.partial().extend({
  id: productIdSchema,
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
