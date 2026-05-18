import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { SalesReportQuerySchema } from "@/modules/reports/validators";
import { resolvePresetRange, type ReportPreset } from "@/modules/reports/service";

function parseDateInput(v?: string | null) {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-").map((x) => Number(x));
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }
  const dt = new Date(v);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function csvEscape(value: unknown) {
  const s = value == null ? "" : String(value);
  if (/[,"\r\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const ctx = await requirePermission(PERMISSIONS.sales_read);
  const url = new URL(req.url);
  const parsed = SalesReportQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Query tidak valid." }, { status: 400 });

  const preset = parsed.data.preset as ReportPreset;
  const from = parseDateInput(parsed.data.from);
  const to = parseDateInput(parsed.data.to);
  const range = resolvePresetRange(preset, { from, to });

  const items = await prisma.sale.findMany({
    where: {
      tenantId: ctx.tenantId,
      createdAt: { gte: range.from, lte: range.to },
      ...(parsed.data.q ? { invoiceNo: { contains: parsed.data.q } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: { invoiceNo: true, createdAt: true, status: true, subtotal: true, discount: true, tax: true, total: true },
  });

  const header = ["invoice_no", "created_at", "status", "subtotal", "discount", "tax", "total"];
  const lines = [
    header.join(","),
    ...items.map((s) =>
      [
        csvEscape(s.invoiceNo),
        csvEscape(new Date(s.createdAt).toISOString()),
        csvEscape(s.status),
        csvEscape(s.subtotal),
        csvEscape(s.discount),
        csvEscape(s.tax),
        csvEscape(s.total),
      ].join(",")
    ),
  ];

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="sales-${range.label.replaceAll(" ", "_").toLowerCase()}.csv"`,
    },
  });
}
