import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { getPrinterSettings } from "@/modules/settings/printer/service";

function toNumber(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

export async function GET(_req: Request, ctx: { params: Promise<{ saleId: string }> }) {
  const authCtx = await requirePermission(PERMISSIONS.sales_read);
  const p = await ctx.params;

  const sale = await prisma.sale.findFirst({
    where: { tenantId: authCtx.tenantId, id: p.saleId },
    include: { items: { orderBy: { name: "asc" } }, payments: true },
  });
  if (!sale) return NextResponse.json({ ok: false, message: "Transaksi tidak ditemukan." }, { status: 404 });

  const printer = await getPrinterSettings({ tenantId: authCtx.tenantId });

  return NextResponse.json({
    ok: true,
    data: {
      printer,
      sale: {
        id: sale.id,
        invoiceNo: sale.invoiceNo,
        status: sale.status,
        createdAt: sale.createdAt.toISOString(),
        subtotal: toNumber(sale.subtotal),
        discount: toNumber(sale.discount),
        tax: toNumber(sale.tax),
        total: toNumber(sale.total),
        items: sale.items.map((i) => ({
          id: i.id,
          name: i.name,
          sku: i.sku,
          price: toNumber(i.price),
          qty: i.qty,
          lineTotal: toNumber(i.lineTotal),
        })),
        payments: sale.payments.map((pmt) => ({
          id: pmt.id,
          method: pmt.method,
          amount: toNumber(pmt.amount),
          reference: pmt.reference ?? null,
        })),
      },
    },
  });
}

