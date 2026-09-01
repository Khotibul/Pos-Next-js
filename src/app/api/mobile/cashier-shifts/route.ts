import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { withApiHandler, apiOk } from "@/lib/api-response";

export const runtime = "nodejs";

const openSchema = z.object({
  id: z.string().min(1),
  cashierId: z.string().min(1),
  branchId: z.string().nullish(),
  openingCash: z.number().default(0),
  openNote: z.string().nullish(),
  openedAt: z.string().nullish(),
});

const closeSchema = z.object({
  closedAt: z.string().nullish(),
  cashCounted: z.number().nullish(),
  cashSystem: z.number().nullish(),
  cashDifference: z.number().nullish(),
  totalSales: z.number().nullish(),
  totalCash: z.number().nullish(),
  totalQris: z.number().nullish(),
  totalTransfer: z.number().nullish(),
  totalEwallet: z.number().nullish(),
  transactionCount: z.number().int().nullish(),
  closeNote: z.string().nullish(),
  closingBalance: z.number().nullish(),
  expectedBalance: z.number().nullish(),
  totalExpenses: z.number().nullish(),
});

// POST /api/mobile/cashier-shifts -> buka shift (upsert)
export const POST = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);
  const body = await req.json().catch(() => null);

  // Deteksi close: jika ada cashCounted/closedAt maka ini close, bukan open
  if (body && (body.cashCounted !== undefined || body.closedAt !== undefined) && body.id) {
    // Close via POST dengan id di body (fallback untuk sync loop yang pakai POST /:id/close)
    const parsed = closeSchema.safeParse(body);
    if (!parsed.success) return Response.json({ ok: false, message: "Data close tidak valid" }, { status: 400 });
    const d = parsed.data;
    const shift = await prisma.cashierShift.findFirst({ where: { id: body.id, tenantId: ctx.tenantId } });
    if (!shift) return Response.json({ ok: false, message: "Shift tidak ditemukan" }, { status: 404 });
    const updated = await prisma.cashierShift.update({
      where: { id: shift.id },
      data: {
        closedAt: d.closedAt ? new Date(d.closedAt) : new Date(),
        cashCounted: d.cashCounted ?? shift.cashCounted,
        cashSystem: d.cashSystem ?? shift.cashSystem,
        cashDifference: d.cashDifference ?? 0,
        totalSales: d.totalSales ?? 0,
        totalCash: d.totalCash ?? 0,
        totalQris: d.totalQris ?? 0,
        totalTransfer: d.totalTransfer ?? 0,
        totalEwallet: d.totalEwallet ?? 0,
        transactionCount: d.transactionCount ?? 0,
        closeNote: d.closeNote ?? null,
        closingBalance: d.closingBalance ?? d.cashCounted ?? 0,
        expectedBalance: d.expectedBalance ?? 0,
        totalExpenses: d.totalExpenses ?? 0,
        status: "CLOSED" as never,
      },
    });
    return apiOk({ id: updated.id, status: updated.status });
  }

  const parsed = openSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, code: "VALIDATION_ERROR", message: "Data shift tidak valid." }, { status: 400 });
  }
  const d = parsed.data;

  // branchId wajib di Prisma, fallback ke branch pertama tenant
  let branchId = d.branchId;
  if (!branchId) {
    const branch = await prisma.branch.findFirst({ where: { tenantId: ctx.tenantId }, select: { id: true } });
    branchId = branch?.id ?? null;
    if (!branchId) {
      // Jika tenant belum punya branch, buat branch default
      const newBranch = await prisma.branch.create({ data: { tenantId: ctx.tenantId, name: "Cabang Utama", code: "MAIN" }, select: { id: true } });
      branchId = newBranch.id;
    }
  }

  const existing = await prisma.cashierShift.findFirst({
    where: { tenantId: ctx.tenantId, id: d.id },
    select: { id: true },
  });

  const shift = existing
    ? await prisma.cashierShift.update({
        where: { id: existing.id },
        data: {
          cashierId: d.cashierId,
          branchId: branchId!,
          openingCash: d.openingCash,
          openNote: d.openNote ?? null,
          status: "OPEN" as never,
        },
      })
    : await prisma.cashierShift.create({
        data: {
          tenantId: ctx.tenantId,
          id: d.id,
          branchId: branchId!,
          cashierId: d.cashierId,
          openedAt: d.openedAt ? new Date(d.openedAt) : new Date(),
          openingCash: d.openingCash,
          openNote: d.openNote ?? null,
          status: "OPEN" as never,
        },
      });

  return apiOk({ id: shift.id, status: shift.status });
});

export const GET = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 100);

  const shifts = await prisma.cashierShift.findMany({
    where: { tenantId: ctx.tenantId, ...(status ? { status: status as never } : {}) },
    orderBy: { openedAt: "desc" },
    take: limit,
  });

  return apiOk(shifts);
});
