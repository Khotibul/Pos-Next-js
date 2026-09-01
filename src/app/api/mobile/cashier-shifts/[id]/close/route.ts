import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { withApiHandler, apiOk } from "@/lib/api-response";

export const runtime = "nodejs";

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
});

export const POST = withApiHandler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const mobile = await getMobileContext(req);
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = closeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, message: "Data close tidak valid" }, { status: 400 });
  }
  const d = parsed.data;
  const shift = await prisma.cashierShift.findFirst({ where: { id, tenantId: mobile.tenantId } });
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
      status: "CLOSED" as never,
    },
  });
  return apiOk({ id: updated.id, status: updated.status });
});
