import { prisma } from "@/lib/prisma";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { withApiHandler, apiOk } from "@/lib/api-response";
import { requireCanUseDatabase } from "@/lib/plan-guard";
import { z } from "zod";

export const runtime = "nodejs";

export const GET = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);

  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.trim();
  const startDate = url.searchParams.get("start_date")?.trim();
  const endDate = url.searchParams.get("end_date")?.trim();
  const pageParam = Number(url.searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const limitParam = Number(url.searchParams.get("limit") ?? "100");
  const limit =
    Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 100;
  const paginate = url.searchParams.has("page");

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  const startOk = start !== null && !isNaN(start.getTime());
  const endOk = end !== null && !isNaN(end.getTime());

  const sales = await prisma.sale.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(search
        ? {
            OR: [
              { invoiceNo: { contains: search, mode: "insensitive" as const } },
              { notes: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(startOk || endOk
        ? {
            createdAt: {
              ...(startOk ? { gte: start as Date } : {}),
              ...(endOk ? { lte: end as Date } : {}),
            },
          }
        : {}),
    },
    include: { items: true, payments: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(paginate ? { skip: (page - 1) * limit } : {}),
  });

  const customerIds = [...new Set(sales.map((s) => s.customerId).filter(Boolean))] as string[];
  const customerMap = new Map<string, string>();
  if (customerIds.length > 0) {
    try {
      const customers = await prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, name: true },
      });
      for (const c of customers) customerMap.set(c.id, c.name);
    } catch {
      // customer table might not exist on older schema
    }
  }

  return apiOk(
    sales.map((s) => {
      const payment = s.payments[0];
      return {
        id: s.id,
        invoiceNo: s.invoiceNo,
        cashierId: s.cashierId,
        shiftId: s.shiftId,
        customerId: s.customerId,
        customerName: s.customerId ? customerMap.get(s.customerId) ?? null : null,
        status: s.status,
        subtotal: Number(s.subtotal),
        discount: Number(s.discount),
        tax: Number(s.tax),
        total: Number(s.total),
        paidAmount: payment ? Number(payment.receivedAmount) : Number(s.total),
        changeAmount: payment ? Number(payment.changeAmount) : 0,
        paymentMethod: payment ? payment.method.toLowerCase() : "cash",
        paymentReference: payment?.reference ?? null,
        notes: s.notes,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        items: s.items.map((i) => ({
          id: i.id,
          saleId: i.saleId,
          productId: i.productId,
          variantId: i.variantId,
          variantName: i.variantName,
          name: i.name,
          sku: i.sku,
          price: Number(i.price),
          qty: Number(i.qty),
          lineTotal: Number(i.lineTotal),
          priceOverridden: i.priceOverridden,
        })),
      };
    }),
  );
});

const saleItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().nullish(),
  name: z.string().default(""),
  variantName: z.string().nullish(),
  sku: z.string().default(""),
  price: z.number().nonnegative().default(0),
  qty: z.number().positive(),
  lineTotal: z.number().nonnegative().default(0),
  priceOverride: z.boolean().optional().default(false),
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
  paymentMethod: z.string().transform(v => v.toUpperCase()).default("CASH"),
  paymentReference: z.string().nullish(),
  dueDate: z.string().nullish(),
  items: z.array(saleItemSchema).min(1),
});

export const POST = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);
  try {
    await requireCanUseDatabase(ctx.tenantId);
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.message === "PLAN_FREE_NO_DB") {
      return Response.json({ ok: false, code: "PLAN_FREE_NO_DB", message: "Paket Free tidak bisa simpan transaksi ke database. Upgrade ke Pro/Enterprise." }, { status: 403 });
    }
    throw e;
  }
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

  const validItems: Array<{
    productId: string;
    variantId: string | null;
    name: string;
    variantName: string | null;
    sku: string;
    price: number;
    qty: number;
    lineTotal: number;
    priceOverride: boolean;
  }> = [];
  const canOverridePrice = ["OWNER", "ADMIN", "SUPER_ADMIN"].includes((ctx.roleName ?? "").toUpperCase());
  if (input.items.some((item) => item.priceOverride) && !canOverridePrice) {
    return Response.json(
      { ok: false, code: "FORBIDDEN", message: "Anda tidak berwenang mengubah harga jual." },
      { status: 403 },
    );
  }
  const customer = input.customerId
    ? await prisma.customer.findFirst({
        where: { id: input.customerId, tenantId: ctx.tenantId, isActive: true },
        select: { isWholesale: true },
      })
    : null;
  const isWholesaleCustomer = customer?.isWholesale === true;
  const resolvedCustomerId = customer ? input.customerId ?? null : null;

  for (const item of input.items) {
    let prod = await prisma.product.findFirst({
      where: { tenantId: ctx.tenantId, id: item.productId },
      select: {
        id: true,
        sku: true,
        name: true,
        sellingPrice: true,
        wholesalePrice: true,
        wholesaleDiscountPercent: true,
        wholesaleMinQty: true,
      },
    });
    if (!prod && item.sku) {
      prod = await prisma.product.findFirst({
        where: { tenantId: ctx.tenantId, sku: item.sku },
        select: {
          id: true,
          sku: true,
          name: true,
          sellingPrice: true,
          wholesalePrice: true,
          wholesaleDiscountPercent: true,
          wholesaleMinQty: true,
        },
      });
    }
    if (!prod) continue;

    let variant: { id: string; sku: string; name: string; sellingPrice: unknown } | null = null;
    if (item.variantId) {
      variant = await prisma.productVariant.findFirst({
        where: { tenantId: ctx.tenantId, id: item.variantId, productId: prod.id, isActive: true },
        select: { id: true, sku: true, name: true, sellingPrice: true },
      });
      if (!variant) continue;
    }

    const qty = Math.round(item.qty);
    const minQty = Number(prod.wholesaleMinQty ?? 0);
    const wholesale = isWholesaleCustomer || (minQty > 0 && qty >= minQty);
    const discountPercent = Number(prod.wholesaleDiscountPercent ?? 0);
    let price = variant ? Number(variant.sellingPrice) : Number(prod.sellingPrice);
    if (wholesale) {
      if (!variant && Number(prod.wholesalePrice ?? 0) > 0) {
        price = Number(prod.wholesalePrice);
      } else if (discountPercent > 0) {
        price = price * (1 - discountPercent / 100);
      }
    }
    if (item.priceOverride) price = item.price;
    validItems.push({
      productId: prod.id,
      variantId: variant?.id ?? null,
      name: variant ? `${prod.name} - ${variant.name}` : (item.name || prod.name),
      variantName: variant?.name ?? item.variantName ?? null,
      sku: variant?.sku || item.sku || prod.sku,
      price,
      qty,
      lineTotal: price * qty,
      priceOverride: item.priceOverride === true,
    });
  }
  if (validItems.length === 0) {
    return Response.json({ ok: false, code: "VALIDATION_ERROR", message: "Produk tidak ditemukan untuk tenant ini." }, { status: 400 });
  }

  const resolvedSubtotal = validItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const resolvedTotal = Math.max(0, resolvedSubtotal - input.discount + input.tax);

  let resolvedShiftId: string | null = input.shiftId ?? null;
  if (resolvedShiftId) {
    const shift = await prisma.cashierShift.findFirst({ where: { id: resolvedShiftId, tenantId: ctx.tenantId }, select: { id: true } });
    if (!shift) resolvedShiftId = null;
  }

  const isCredit = input.paymentMethod === "CREDIT";

  const created = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        tenantId: ctx.tenantId,
        invoiceNo: input.invoiceNo,
        cashierId: input.cashierId ?? null,
        shiftId: resolvedShiftId,
        customerId: resolvedCustomerId,
        status: isCredit ? "CREDIT" : input.status,
        subtotal: resolvedSubtotal,
        discount: input.discount,
        tax: input.tax,
        total: resolvedTotal,
        notes: input.notes ?? null,
        items: {
          create: validItems.map((item) => ({
            tenantId: ctx.tenantId,
            productId: item.productId,
            variantId: item.variantId,
            name: item.name,
            variantName: item.variantName,
            sku: item.sku,
            price: item.price,
            qty: item.qty,
            lineTotal: item.lineTotal,
            priceOverridden: item.priceOverride,
          })),
        },
        payments: {
          create: {
            tenantId: ctx.tenantId,
            method: input.paymentMethod,
            amount: isCredit ? 0 : resolvedTotal,
            receivedAmount: isCredit ? 0 : (input.paidAmount || resolvedTotal),
            changeAmount: isCredit ? 0 : input.changeAmount,
            reference: input.paymentReference ?? null,
          },
        },
      },
      include: { items: true, payments: true },
    });

    if (isCredit) {
      await tx.receivable.create({
        data: {
          tenantId: ctx.tenantId,
          customerId: resolvedCustomerId,
          saleId: sale.id,
          invoiceNo: input.invoiceNo,
          description: `Hutang dari penjualan ${input.invoiceNo}`,
          totalAmount: resolvedTotal,
          paidAmount: 0,
          remainingAmount: resolvedTotal,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          status: "UNPAID",
        },
      });
    }

    const warehouse = await tx.warehouse.findFirst({
      where: { tenantId: ctx.tenantId, isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    if (warehouse) {
      for (const item of validItems) {
        const stockRows = await tx.productWarehouseStock.findMany({
          where: {
            tenantId: ctx.tenantId,
            warehouseId: warehouse.id,
            productId: item.productId,
            variantId: item.variantId,
            qty: { gt: 0 },
          },
          orderBy: { updatedAt: "asc" },
          select: { id: true, qty: true },
        });
        let remaining = item.qty;
        for (const stock of stockRows) {
          if (remaining <= 0) break;
          const decrement = Math.min(remaining, Number(stock.qty));
          await tx.productWarehouseStock.update({
            where: { id: stock.id },
            data: { qty: { decrement } },
          });
          remaining -= decrement;
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
    customerId: created.customerId,
    status: created.status,
    subtotal: Number(created.subtotal),
    discount: Number(created.discount),
    tax: Number(created.tax),
    total: Number(created.total),
    paidAmount: payment ? Number(payment.receivedAmount) : input.paidAmount,
    changeAmount: payment ? Number(payment.changeAmount) : input.changeAmount,
    paymentMethod: payment?.method ?? input.paymentMethod,
    paymentReference: payment?.reference ?? null,
    notes: input.notes ?? null,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
    items: created.items.map((i) => ({
      id: i.id,
      saleId: i.saleId,
      productId: i.productId,
      variantId: i.variantId,
      variantName: i.variantName,
      name: i.name,
      sku: i.sku,
      price: Number(i.price),
      qty: Number(i.qty),
      lineTotal: Number(i.lineTotal),
      priceOverridden: i.priceOverridden,
    })),
  });
});
