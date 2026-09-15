import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { withApiHandler, apiOk } from "@/lib/api-response";
import { computeDebtStatus } from "@/shared/utils/debt-status";

export const runtime = "nodejs";

export const GET = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);
  const url = new URL(req.url);
  const receivableId = url.searchParams.get("receivableId")?.trim() || null;
  const where: Record<string, unknown> = { tenantId: ctx.tenantId };
  if (receivableId) (where as Record<string, unknown>).receivableId = receivableId;
  const items = await prisma.receivablePayment.findMany({ where: where as never, orderBy: { paidAt: "desc" }, take: 500 });
  return apiOk(items.map((p) => ({ id: p.id, receivableId: p.receivableId, amount: Number(p.amount), method: p.method, reference: p.reference, notes: p.notes, paidAt: p.paidAt, createdAt: p.createdAt })));
});

const schema = z.object({
  id: z.string().min(1).optional(),
  receivableId: z.string().min(1),
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

  const receivable = await prisma.receivable.findFirst({ where: { tenantId: ctx.tenantId, id: d.receivableId }, select: { id: true, totalAmount: true, paidAmount: true, dueDate: true } });
  if (!receivable) return Response.json({ ok: false, code: "NOT_FOUND", message: "Piutang tidak ditemukan." }, { status: 404 });

  const total = Number(receivable.totalAmount);
  const paid = Number(receivable.paidAmount);
  const remaining = total - paid;
  if (d.amount > remaining) return Response.json({ ok: false, code: "VALIDATION_ERROR", message: `Melebihi sisa piutang ${remaining}` }, { status: 400 });

  const paidAt = d.paidAt ? new Date(d.paidAt) : new Date();
  if (isNaN(paidAt.getTime())) return Response.json({ ok: false, code: "VALIDATION_ERROR", message: "Tanggal bayar tidak valid." }, { status: 400 });

  // idempotent: if id provided and exists, return it
  if (d.id) {
    const existing = await prisma.receivablePayment.findFirst({ where: { tenantId: ctx.tenantId, id: d.id }, select: { id: true } });
    if (existing) return apiOk({ id: existing.id });
  }

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.receivablePayment.create({
      data: {
        ...(d.id ? { id: d.id } : {}),
        tenantId: ctx.tenantId,
        receivableId: d.receivableId,
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
    const newStatus = computeDebtStatus(total, newPaid, receivable.dueDate);
    await tx.receivable.update({ where: { id: d.receivableId }, data: { paidAmount: newPaid, remainingAmount: newRemaining, status: newStatus } });
    return payment;
  });

  return apiOk({ id: result.id });
});
