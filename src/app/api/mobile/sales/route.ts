import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { withApiHandler, apiOk } from "@/lib/api-response";

export const runtime = "nodejs";

const saleItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().default(""),
  sku: z.string().default(""),
  price: z.number().nonnegative().default(0),
  qty: z.number().positive(),
  lineTotal: z.number().nonnegative().default(0),
});

const createSaleSchema = z.object({
  invoiceNo: z.string().min(1),
  cashierId: z.string().nullish(),
  shiftId: z.string().nullish(),
  customerId: z.string().nullish(),
  status: z.string().default("PAID"),
  subtotal: z.number().nonnegative().default(0),
  discount: z.number().nonnegative().default(0),
  tax: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
  notes: z.string().nullish(),
  paidAmount: z.number().nonnegative().default(0),
  changeAmount: z.number().nonnegative().default(0),
  paymentMethod: z.string().default("cash"),
  paymentReference: z.string().nullish(),
  items: z.array(saleItemSchema).min(1),
});

export const POST = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);
  const body = await req.json().catch(() => null);
  const parsed = createSaleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, code: "VALIDATION_ERROR", message: "Data penjualan tidak valid." },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const existing = await prisma.sale.findUnique({
    where: { tenantId_invoiceNo: { tenantId: ctx.tenantId, invoiceNo: input.invoiceNo } },
    select: { id: true },
  });
  if (existing) {
    return apiOk({ duplicate: true, id: existing.id });
  }

  const created = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        tenantId: ctx.tenantId,
        invoiceNo: input.invoiceNo,
        cashierId: input.cashierId ?? null,
        shiftId: input.shiftId ?? null,
        status: input.status,
        subtotal: input.subtotal,
        discount: input.discount,
        tax: input.tax,
        total: input.total,
        items: {
          create: input.items.map((item) => ({
            tenantId: ctx.tenantId,
            productId: item.productId,
            name: item.name,
            sku: item.sku,
            price: item.price,
            qty: Math.round(item.qty),
            lineTotal: item.lineTotal,
          })),
        },
        payments: {
          create: {
            tenantId: ctx.tenantId,
            method: input.paymentMethod.toUpperCase(),
            amount: input.total,
            receivedAmount: input.paidAmount || input.total,
            changeAmount: input.changeAmount,
            reference: input.paymentReference ?? null,
          },
        },
      },
      include: { items: true, payments: true },
    });

    const warehouse = await tx.warehouse.findFirst({
      where: { tenantId: ctx.tenantId, isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    if (warehouse) {
      for (const item of input.items) {
        const stock = await tx.productWarehouseStock.findFirst({
          where: {
            tenantId: ctx.tenantId,
            warehouseId: warehouse.id,
            productId: item.productId,
          },
          select: { id: true, qty: true },
        });
        if (stock) {
          await tx.productWarehouseStock.update({
            where: { id: stock.id },
            data: { qty: Math.max(0, Number(stock.qty) - item.qty) },
          });
        }
      }
    }

    return sale;
  });

  const payment = created.payments[0];

  return apiOk({
    id: created.id,
    invoiceNo: created.invoiceNo,
    cashierId: created.cashierId,
    shiftId: created.shiftId,
    customerId: input.customerId ?? null,
    status: created.status,
    subtotal: Number(created.subtotal),
    discount: Number(created.discount),
    tax: Number(created.tax),
    total: Number(created.total),
    paidAmount: payment ? Number(payment.receivedAmount) : input.paidAmount,
    changeAmount: payment ? Number(payment.changeAmount) : input.changeAmount,
    paymentMethod: payment?.method.toLowerCase() ?? input.paymentMethod,
    paymentReference: payment?.reference ?? null,
    notes: input.notes ?? null,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
    items: created.items.map((i) => ({
      id: i.id,
      saleId: i.saleId,
      productId: i.productId,
      name: i.name,
      sku: i.sku,
      price: Number(i.price),
      qty: Number(i.qty),
      lineTotal: Number(i.lineTotal),
    })),
  });
});
