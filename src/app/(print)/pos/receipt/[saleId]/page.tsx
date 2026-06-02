import { notFound } from "next/navigation";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getPrinterSettings } from "@/modules/settings/printer/service";
import { ReceiptView } from "@/modules/transactions/components/receipt-view";

export const dynamic = "force-dynamic";

function toNumber(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ saleId: string }>;
  searchParams?: Promise<{ auto?: string }>;
}) {
  const ctx = await requirePermission(PERMISSIONS.sales_read);
  const p = await params;
  const sp = (await searchParams) ?? {};

  const sale = await prisma.sale.findFirst({
    where: { tenantId: ctx.tenantId, id: p.saleId },
    include: { items: { orderBy: { name: "asc" } }, payments: true },
  });
  if (!sale) notFound();

  const printer = await getPrinterSettings({ tenantId: ctx.tenantId });

  const saleData = {
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
      receivedAmount: toNumber(pmt.receivedAmount),
      changeAmount: toNumber(pmt.changeAmount),
      reference: pmt.reference,
    })),
  };

  const autoPrint = printer.autoPrintAfterPayment && sp.auto === "1";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <ReceiptView sale={saleData} printer={printer} autoPrint={autoPrint} />
    </div>
  );
}
