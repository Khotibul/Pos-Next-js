import { z } from "zod";

export const saleIdSchema = z.string().min(1);

export const cartItemSchema = z.object({
  productId: z.string().min(1),
  qty: z.coerce.number().int().min(1).max(999),
});

export const paymentSchema = z.object({
  method: z.enum(["CASH", "QRIS", "TRANSFER", "EWALLET", "CARD"]),
  amount: z.coerce.number().min(0),
  reference: z.string().max(100).optional().or(z.literal("")),
});

export const createSaleSchema = z.object({
  items: z.array(cartItemSchema).min(1),
  discount: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  payment: paymentSchema,
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;

