import { NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { requireActiveTenant } from "@/lib/tenant-guards";
import { importRowSchema } from "@/modules/products/import-validator";
import { importProducts } from "@/modules/products/import-service";

const payloadSchema = z.object({
  rows: z.array(importRowSchema).min(1).max(5000),
});

export async function POST(req: Request) {
  await requirePermission(PERMISSIONS.products_import);
  const ctx = await requireActiveTenant();

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Payload tidak valid." }, { status: 400 });

  const result = await importProducts({
    tenantId: ctx.tenantId,
    branchId: ctx.branchId,
    userId: ctx.userId,
    rows: parsed.data.rows,
  });

  return NextResponse.json({ ok: true, data: result });
}

