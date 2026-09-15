import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { withApiHandler, apiOk } from "@/lib/api-response";
import { computeDebtStatus } from "@/shared/utils/debt-status";

export const runtime = "nodejs";

export const GET = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "100"), 500);
  const status = url.searchParams.get("status")?.trim() || null;
  const search = url.searchParams.get("search")?.trim() || null;

  const where: Record<string, unknown> = { tenantId: ctx.tenantId };
  if (status) (where as Record<string, unknown>).status = status;
  if (search) {
    (where as Record<string, unknown>).OR = [
      { invoiceNo: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.payable.findMany({
    where: where as never,
    include: { payments: true, supplier: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return apiOk(
    items.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      supplierId: r.supplierId,
      purchaseOrderId: r.purchaseOrderId,
      invoiceNo: r.invoiceNo,
      description: r.description,
      totalAmount: Number(r.totalAmount),
      paidAmount: Number(r.paidAmount),
      remainingAmount: Number(r.remainingAmount),
      dueDate: r.dueDate,
      status: r.status,
      notes: r.notes,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      supplierName: r.supplier?.name ?? null,
      payments: r.payments.map((p) => ({
        id: p.id,
        payableId: p.payableId,
        amount: Number(p.amount),
        method: p.method,
        reference: p.reference,
        notes: p.notes,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      })),
    }))
  );
});

const payableSchema = z.object({
  id: z.string().min(1),
  supplierId: z.string().nullish(),
  purchaseOrderId: z.string().nullish(),
  invoiceNo: z.string().min(1),
  description: z.string().nullish(),
  totalAmount: z.number().nonnegative(),
  paidAmount: z.number().nonnegative().default(0),
  dueDate: z.string().nullish(),
  notes: z.string().nullish(),
});

export const POST = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);
  const body = await req.json().catch(() => null);
  const parsed = payableSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, code: "VALIDATION_ERROR", message: "Data utang tidak valid." }, { status: 400 });
  }
  const d = parsed.data;

  let supplierId: string | null = null;
  if (d.supplierId) {
    const s = await prisma.supplier.findFirst({ where: { id: d.supplierId, tenantId: ctx.tenantId }, select: { id: true } });
    supplierId = s?.id ?? null;
  }
  let purchaseOrderId: string | null = null;
  if (d.purchaseOrderId) {
    const po = await prisma.purchaseOrder.findFirst({ where: { id: d.purchaseOrderId, tenantId: ctx.tenantId }, select: { id: true } });
    purchaseOrderId = po?.id ?? null;
  }

  const dueDate = d.dueDate ? new Date(d.dueDate) : null;
  const totalAmount = d.totalAmount;
  const paidAmount = d.paidAmount ?? 0;
  const remainingAmount = Math.max(0, totalAmount - paidAmount);
  const status = computeDebtStatus(totalAmount, paidAmount, dueDate);

  const existing = await prisma.payable.findFirst({ where: { tenantId: ctx.tenantId, OR: [{ id: d.id }, { invoiceNo: d.invoiceNo }] }, select: { id: true } });

  const data = {
    invoiceNo: d.invoiceNo,
    supplierId,
    purchaseOrderId,
    description: d.description ?? null,
    totalAmount,
    paidAmount,
    remainingAmount,
    dueDate,
    status,
    notes: d.notes ?? null,
  };

  const rec = existing
    ? await prisma.payable.update({ where: { id: existing.id }, data })
    : await prisma.payable.create({ data: { tenantId: ctx.tenantId, id: d.id, ...data } });

  return apiOk({ id: rec.id, invoiceNo: rec.invoiceNo });
});
