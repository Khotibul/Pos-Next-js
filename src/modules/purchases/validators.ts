import { z } from "zod";

export const purchaseStatusSchema = z.enum(["DRAFT", "ORDERED", "RECEIVED", "CANCELED"]);

export const upsertPurchaseOrderSchema = z.object({
  id: z.string().min(5).optional(),
  supplierId: z.string().min(5).optional().or(z.literal("")),
  orderNo: z.string().trim().min(3).max(40).optional().or(z.literal("")),
  status: purchaseStatusSchema.default("DRAFT"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type UpsertPurchaseOrderInput = z.infer<typeof upsertPurchaseOrderSchema>;

