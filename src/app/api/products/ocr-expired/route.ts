import { NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { parseExpiredFromText } from "@/modules/products/date-parser";

const payloadSchema = z.object({
  text: z.string().min(1).max(20000),
});

export async function POST(req: Request) {
  await requirePermission(PERMISSIONS.products_ocr_scan);

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Payload tidak valid." }, { status: 400 });

  const r = parseExpiredFromText(parsed.data.text);
  return NextResponse.json({
    ok: true,
    data: {
      expiredDate: r.expiredDate ? r.expiredDate.toISOString() : null,
      batchNumber: r.batchNumber,
      matched: r.matched,
      confidence: r.confidenceHint,
      rawText: r.rawText,
    },
  });
}

