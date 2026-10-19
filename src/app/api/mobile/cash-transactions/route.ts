import { z } from "zod";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { withApiHandler, apiOk } from "@/lib/api-response";
import { requireCanUseDatabase } from "@/lib/plan-guard";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({
  id: z.string().min(1),
  shiftId: z.string().nullish(),
  type: z.string().min(1),
  category: z.string().min(1),
  amount: z.number(),
  description: z.string().nullish(),
  transactionDate: z.coerce.date().optional(),
  referenceType: z.string().nullish(),
  referenceId: z.string().nullish(),
  userId: z.string().min(1),
});

function shape(r: {
  id: string;
  shiftId: string | null;
  userId: string;
  type: string;
  category: string;
  amount: unknown;
  description: string | null;
  referenceType: string | null;
  referenceId: string | null;
  transactionDate: Date;
  createdAt: Date;
}) {
  return {
    id: r.id,
    shiftId: r.shiftId,
    userId: r.userId,
    type: r.type,
    category: r.category,
    amount: Number(r.amount),
    description: r.description,
    referenceType: r.referenceType,
    referenceId: r.referenceId,
    transactionDate: r.transactionDate,
    createdAt: r.createdAt,
  };
}

export const POST = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);
  try {
    await requireCanUseDatabase(ctx.tenantId);
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.message === "PLAN_FREE_NO_DB") {
      return Response.json({ ok: false, code: "PLAN_FREE_NO_DB", message: "Paket Free tidak bisa simpan transaksi kas ke database. Upgrade ke Pro/Enterprise." }, { status: 403 });
    }
    throw e;
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, code: "VALIDATION_ERROR", message: "Data transaksi kas tidak valid." }, { status: 400 });
  }
  const d = parsed.data;
  const data = {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    shiftId: d.shiftId ?? null,
    type: d.type,
    category: d.category,
    amount: d.amount,
    description: d.description ?? null,
    referenceType: d.referenceType ?? null,
    referenceId: d.referenceId ?? null,
    transactionDate: d.transactionDate ?? new Date(),
  };
  const existing = await prisma.cashTransaction.findFirst({
    where: { id: d.id, tenantId: ctx.tenantId },
    select: { id: true },
  });
  const row = existing
    ? await prisma.cashTransaction.update({ where: { id: existing.id }, data })
    : await prisma.cashTransaction.create({ data: { id: d.id, ...data } });
  return apiOk({ id: row.id, synced: true });
});

export const GET = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "100"), 500);
  const shiftId = url.searchParams.get("shiftId")?.trim() || null;
  const type = url.searchParams.get("type")?.trim() || null;
  const startDate = url.searchParams.get("startDate")?.trim() || null;
  const endDate = url.searchParams.get("endDate")?.trim() || null;

  const where: Record<string, unknown> = { tenantId: ctx.tenantId };
  if (shiftId) where.shiftId = shiftId;
  if (type) where.type = type;
  if (startDate || endDate) {
    const range: Record<string, Date> = {};
    if (startDate) range.gte = new Date(startDate);
    if (endDate) range.lte = new Date(endDate);
    where.transactionDate = range;
  }

  const rows = await prisma.cashTransaction.findMany({
    where,
    orderBy: { transactionDate: "desc" },
    take: Number.isFinite(limit) && limit > 0 ? limit : 100,
  });
  return apiOk(rows.map(shape));
});
