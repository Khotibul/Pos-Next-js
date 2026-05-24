import { z } from "zod";

export const productIdSchema = z.string().min(1);

export const createProductSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(2).max(200),
  barcode: z.string().max(100).optional().or(z.literal("")),
  qrCode: z.string().max(200).optional().or(z.literal("")),
  categoryId: z.string().optional().or(z.literal("")),
  brandId: z.string().optional().or(z.literal("")),
  unitId: z.string().optional().or(z.literal("")),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  isActive: z.coerce.boolean().optional().default(true),
});

export const updateProductSchema = createProductSchema.partial().extend({
  id: productIdSchema,
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
