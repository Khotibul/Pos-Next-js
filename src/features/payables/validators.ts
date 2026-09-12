import { z } from "zod";

export const upsertPayableSchema = z.object({
  id: z.string().min(1).optional(),
  supplierId: z.string().min(1).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  purchaseOrderId: z.string().min(1).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  invoiceNo: z.string().trim().min(2, "Invoice minimal 2 karakter").max(60),
  description: z.string().trim().max(240).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  totalAmount: z.coerce.number().nonnegative("Total harus >= 0"),
  dueDate: z.string().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  notes: z.string().trim().max(500).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
});

export const createPayablePaymentSchema = z.object({
  payableId: z.string().min(1),
  amount: z.coerce.number().positive("Jumlah harus > 0"),
  method: z.string().trim().min(1).max(30).default("CASH"),
  reference: z.string().trim().max(120).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  notes: z.string().trim().max(240).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  paidAt: z.string().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
});

export type UpsertPayableInput = z.infer<typeof upsertPayableSchema>;
export type CreatePayablePaymentInput = z.infer<typeof createPayablePaymentSchema>;
