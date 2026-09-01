import { z } from "zod";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { withApiHandler, apiOk } from "@/lib/api-response";

export const runtime = "nodejs";

// Return belum ada Prisma model – endpoint stub untuk sync pending agar tidak stuck.
// Jika nanti ada model Return, ganti dengan prisma.return.create.
const schema = z.object({
  id: z.string().min(1),
  returnNumber: z.string().min(1),
  saleId: z.string().nullish(),
  type: z.string().min(1),
  reason: z.string().min(1),
  total: z.number().default(0),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number(),
    price: z.number(),
  })).default([]),
});

export const POST = withApiHandler(async (req: Request) => {
  await getMobileContext(req);
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, code: "VALIDATION_ERROR", message: "Data return tidak valid." }, { status: 400 });
  }
  return apiOk({ id: parsed.data.id, ok: true });
});

export const GET = withApiHandler(async (req: Request) => {
  await getMobileContext(req);
  return apiOk([]);
});
