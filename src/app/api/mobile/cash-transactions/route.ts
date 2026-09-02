import { z } from "zod";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { withApiHandler, apiOk } from "@/lib/api-response";
import { requireCanUseDatabase } from "@/lib/plan-guard";

export const runtime = "nodejs";

// Mobile cash-transaksi (income/expense dalam shift) – belum ada Prisma model,
// jadi endpoint ini hanya untuk clear pending isSynced di device.
// Jika nanti ada model CashTransaction, ganti dengan prisma.cashTransaction.create.
const schema = z.object({
  id: z.string().min(1),
  shiftId: z.string().nullish(),
  type: z.string().min(1),
  category: z.string().min(1),
  amount: z.number(),
  description: z.string().nullish(),
  transactionDate: z.string().nullish(),
  userId: z.string().min(1),
});

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
  // TODO: persist ke prisma.cashTransaction jika model sudah ada
  // Untuk sekarang cukup return ok agar device markSynced dan pending hilang
  return apiOk({ id: parsed.data.id, ok: true });
});

export const GET = withApiHandler(async (req: Request) => {
  await getMobileContext(req);
  return apiOk([]);
});
