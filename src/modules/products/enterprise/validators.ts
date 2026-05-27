import { z } from "zod";

export const warehouseTypeSchema = z.enum(["CENTRAL", "BRANCH", "TRANSIT"]);

export const createWarehouseSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: warehouseTypeSchema.default("BRANCH"),
  branchId: z.string().trim().optional().or(z.literal("")),
  isActive: z.coerce.boolean().optional().default(true),
});

export const updateWarehouseSchema = createWarehouseSchema.partial().extend({
  id: z.string().min(1),
});

export const createProductVariantSchema = z.object({
  productId: z.string().min(1),
  sku: z.string().trim().max(50).optional().or(z.literal("")),
  name: z.string().trim().min(2).max(200),
  barcode: z.string().trim().max(100).optional().or(z.literal("")),
  qrCode: z.string().trim().max(200).optional().or(z.literal("")),
  option1Name: z.string().trim().max(40).optional().or(z.literal("")),
  option1Value: z.string().trim().max(60).optional().or(z.literal("")),
  option2Name: z.string().trim().max(40).optional().or(z.literal("")),
  option2Value: z.string().trim().max(60).optional().or(z.literal("")),
  option3Name: z.string().trim().max(40).optional().or(z.literal("")),
  option3Value: z.string().trim().max(60).optional().or(z.literal("")),
  costPrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  isActive: z.coerce.boolean().optional().default(true),
});

export const updateProductVariantSchema = createProductVariantSchema.partial().extend({
  id: z.string().min(1),
});

export const createAdjustmentSchema = z.object({
  warehouseId: z.string().min(1),
  reason: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().optional().or(z.literal("")),
        batchId: z.string().optional().or(z.literal("")),
        qtyDelta: z.coerce.number(),
      }),
    )
    .min(1),
});

export const createTransferSchema = z.object({
  fromWarehouseId: z.string().min(1),
  toWarehouseId: z.string().min(1),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().optional().or(z.literal("")),
        batchId: z.string().optional().or(z.literal("")),
        qty: z.coerce.number().min(0.000001),
      }),
    )
    .min(1),
});

export const createOpnameSchema = z.object({
  warehouseId: z.string().min(1),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().optional().or(z.literal("")),
        batchId: z.string().optional().or(z.literal("")),
        countedQty: z.coerce.number().min(0),
      }),
    )
    .min(1),
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;
export type CreateProductVariantInput = z.infer<typeof createProductVariantSchema>;
export type UpdateProductVariantInput = z.infer<typeof updateProductVariantSchema>;
export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>;
export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type CreateOpnameInput = z.infer<typeof createOpnameSchema>;

