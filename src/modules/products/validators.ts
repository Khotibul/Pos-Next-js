import { z } from "zod";

export const productIdSchema = z.string().min(1);

export const productTypeSchema = z.enum(["SINGLE", "VARIANT", "BUNDLE", "SERVICE", "DIGITAL", "ASSEMBLY"]);

const booleanFromForm = z.preprocess(
  (v) => {
    if (v === "true" || v === "on" || v === true) return true;
    if (v === "false" || v === "off" || v === false) return false;
    return undefined;
  },
  z.boolean().optional()
);

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
  wholesalePrice: z.coerce.number().min(0).optional(),
  wholesaleDiscountPercent: z.coerce.number().min(0).max(100).optional(),
  wholesaleMinQty: z.coerce.number().int().min(0).optional(),
  initialStock: z.coerce.number().int().min(0).optional(),
  isActive: booleanFromForm.default(true),
  isFeatured: booleanFromForm.default(false),
  isConsignment: booleanFromForm.default(false),
  type: productTypeSchema.optional().default("SINGLE"),
});

export const updateProductSchema = createProductSchema.partial().extend({
  id: productIdSchema,
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
