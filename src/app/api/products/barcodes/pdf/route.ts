import { NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { requireActiveTenant } from "@/lib/tenant-guards";
import { prisma } from "@/lib/prisma";
import { code128Svg } from "@/lib/barcode/code128";

export const runtime = "nodejs";

const payloadSchema = z.object({
  label: z.object({
    preset: z.enum(["38x25", "50x30", "custom"]),
    widthMm: z.coerce.number().min(10).max(120).optional(),
    heightMm: z.coerce.number().min(10).max(120).optional(),
    gapMm: z.coerce.number().min(0).max(10).optional().default(2),
  }),
  includeQr: z.coerce.boolean().optional().default(true),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.coerce.number().int().min(1).max(200),
      }),
    )
    .min(1)
    .max(200),
});

const MM_TO_PT = 72 / 25.4;

function mm(v: number) {
  return v * MM_TO_PT;
}

function pickLabelSize(label: z.infer<typeof payloadSchema>["label"]) {
  if (label.preset === "38x25") return { wMm: 38, hMm: 25, gapMm: label.gapMm ?? 2 };
  if (label.preset === "50x30") return { wMm: 50, hMm: 30, gapMm: label.gapMm ?? 2 };
  const w = label.widthMm ?? 50;
  const h = label.heightMm ?? 30;
  return { wMm: w, hMm: h, gapMm: label.gapMm ?? 2 };
}

export async function POST(req: Request) {
  await requirePermission(PERMISSIONS.products_barcode_print);
  const ctx = await requireActiveTenant();

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Payload tidak valid." }, { status: 400 });

  const labelSize = pickLabelSize(parsed.data.label);
  const productIds = Array.from(new Set(parsed.data.items.map((i) => i.productId)));

  const products = await prisma.product.findMany({
    where: { tenantId: ctx.tenantId, id: { in: productIds } },
    select: { id: true, sku: true, name: true, barcode: true, qrCode: true, sellingPrice: true },
  });
  const map = new Map(products.map((p) => [p.id, p]));

  const { jsPDF } = await import("jspdf");
  const QR = await import("qrcode");

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const margin = mm(8);
  const gap = mm(labelSize.gapMm);
  const labelW = mm(labelSize.wMm);
  const labelH = mm(labelSize.hMm);

  const cols = Math.max(1, Math.floor((pageW - margin * 2 + gap) / (labelW + gap)));
  const rows = Math.max(1, Math.floor((pageH - margin * 2 + gap) / (labelH + gap)));
  const perPage = cols * rows;

  const labels: Array<{ sku: string; name: string; barcodeValue: string; qrValue: string; price: number }> = [];
  for (const it of parsed.data.items) {
    const p = map.get(it.productId);
    if (!p) continue;
    const barcodeValue = (p.barcode ?? p.sku).trim();
    const qrValue = (p.qrCode ?? barcodeValue).trim();
    for (let k = 0; k < it.qty; k++) {
      labels.push({ sku: p.sku, name: p.name, barcodeValue, qrValue, price: Number(p.sellingPrice) });
    }
  }
  if (labels.length === 0) return NextResponse.json({ message: "Tidak ada produk untuk dicetak." }, { status: 400 });

  doc.setFont("helvetica", "normal");

  for (let idx = 0; idx < labels.length; idx++) {
    const inPage = idx % perPage;
    if (idx > 0 && inPage === 0) doc.addPage();

    const col = inPage % cols;
    const row = Math.floor(inPage / cols);
    const x0 = margin + col * (labelW + gap);
    const y0 = margin + row * (labelH + gap);

    // Border (light)
    doc.setDrawColor(220);
    doc.setLineWidth(0.5);
    doc.roundedRect(x0, y0, labelW, labelH, 6, 6);

    const L = labels[idx]!;
    const padding = mm(2);
    const innerX = x0 + padding;
    const innerY = y0 + padding;
    const innerW = labelW - padding * 2;
    const innerH = labelH - padding * 2;

    // Name
    doc.setTextColor(20);
    doc.setFontSize(7);
    doc.text(L.name.slice(0, 26), innerX, innerY + 7);

    // Barcode (CODE128 rects)
    const barcodeH = Math.min(innerH - 14, mm(12));
    const svg = code128Svg(L.barcodeValue, { height: 44, moduleWidth: 1.2, quietZone: 6 });
    const scaleX = innerW / svg.width;
    const barY = innerY + 10;

    doc.setFillColor(0, 0, 0);
    for (const r of svg.rects) {
      const x = innerX + r.x * scaleX;
      const w = r.w * scaleX;
      doc.rect(x, barY, w, barcodeH, "F");
    }

    // Barcode text
    doc.setFontSize(6);
    doc.setTextColor(80);
    doc.text(L.barcodeValue.slice(0, 22), innerX, barY + barcodeH + 8);

    // QR (optional, right bottom)
    if (parsed.data.includeQr) {
      const size = Math.min(mm(12), innerH - 12);
      const qrX = innerX + innerW - size;
      const qrY = innerY + innerH - size;

      const qr = QR.create(L.qrValue, { errorCorrectionLevel: "M" });
      const count = qr.modules.size;
      const cell = size / count;
      doc.setFillColor(0, 0, 0);
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (qr.modules.get(c, r)) {
            doc.rect(qrX + c * cell, qrY + r * cell, cell, cell, "F");
          }
        }
      }
    }
  }

  const out = doc.output("arraybuffer");
  return new NextResponse(Buffer.from(out), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="barcode-labels.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
