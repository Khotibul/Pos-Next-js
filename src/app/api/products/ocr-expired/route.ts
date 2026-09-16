import { NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { withApiHandler, apiOk } from "@/lib/api-response";
import { parseExpiredFromText } from "@/modules/products/date-parser";

const payloadSchema = z.object({
  text: z.string().min(1).max(20000),
});

export const POST = withApiHandler(async (req: Request) => {
  await requirePermission(PERMISSIONS.products_ocr_scan);

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Payload tidak valid." }, { status: 400 });

  const r = parseExpiredFromText(parsed.data.text);
  return apiOk({
    expiredDate: r.expiredDate ? r.expiredDate.toISOString() : null,
    batchNumber: r.batchNumber,
    matched: r.matched,
    confidence: r.confidenceHint,
    rawText: r.rawText,
  });
});
