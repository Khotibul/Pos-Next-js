import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { withApiHandler, apiOk } from "@/lib/api-response";

export const runtime = "nodejs";

export const GET = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);
  const url = new URL(req.url);
  const payableId = url.searchParams.get("payableId")?.trim() || null;
  const where: Record<string, unknown> = { tenantId: ctx.tenantId };
  if (payableId) (where as Record<string, unknown>).payableId = payableId;
  const items = await prisma.payablePayment.findMany({ where: where as never, orderBy: { paidAt: "desc" }, take: 500 });
  return apiOk(items.map((p) => ({ id: p.id, payableId: p.payableId, amount: Number(p.amount), method: p.method, reference: p.reference, notes: p.notes, paidAt: p.paidAt, createdAt: p.createdAt })));
});

const schema = z.object({
  id: z.string().min(1).optional(),
  payableId: z.string().min(1),
  amount: z.number().positive(),
  method: z.string().default("CASH"),
  reference: z.string().nullish(),
  notes: z.string().nullish(),
  paidAt: z.string().nullish(),
});

export const POST = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ ok: false, code: "VALIDATION_ERROR", message: "Data pembayaran tidak valid." }, { status: 400 });
  const d = parsed.data;

  const payable = await prisma.payable.findFirst({ where: { tenantId: ctx.tenantId, id: d.payableId }, select: { id: true, totalAmount: true, paidAmount: true, dueDate: true } });
  if (!payable) return Response.json({ ok: false, code: "NOT_FOUND", message: "Utang tidak ditemukan." }, { status: 404 });

  const total = Number(payable.totalAmount);
  const paid = Number(payable.paidAmount);
  const remaining = total - paid;
  if (d.amount > remaining) return Response.json({ ok: false, code: "VALIDATION_ERROR", message: `Melebihi sisa utang ${remaining}` }, { status: 400 });

  const paidAt = d.paidAt ? new Date(d.paidAt) : new Date();

  if (d.id) {
    const existing = await prisma.payablePayment.findFirst({ where: { tenantId: ctx.tenantId, id: d.id }, select: { id: true } });
    if (existing) return apiOk({ id: existing.id });
  }

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payablePayment.create({
      data: {
        ...(d.id ? { id: d.id } : {}),
        tenantId: ctx.tenantId,
        payableId: d.payableId,
        amount: d.amount,
        method: d.method.toUpperCase(),
        reference: d.reference ?? null,
        notes: d.notes ?? null,
        paidAt,
      },
      select: { id: true },
    });
    const newPaid = paid + d.amount;
    const newRemaining = Math.max(0, total - newPaid);
    let newStatus: string = "UNPAID";
    if (newPaid >= total && total > 0) newStatus = "PAID";
    else if (newPaid > 0) newStatus = payable.dueDate && payable.dueDate < new Date() ? "OVERDUE" : "PARTIAL";
    else newStatus = payable.dueDate && payable.dueDate < new Date() ? "OVERDUE" : "UNPAID";
    await tx.payable.update({ where: { id: d.payableId }, data: { paidAmount: newPaid, remainingAmount: newRemaining, status: newStatus as never } });
    return payment;
  });

  return apiOk({ id: result.id });
});
