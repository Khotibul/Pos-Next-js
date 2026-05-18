import { notFound } from "next/navigation";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getPrinterSettings } from "@/modules/settings/printer/service";

export const dynamic = "force-dynamic";

function rupiah(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
}

function ReceiptPrintScript({ autoPrint }: { autoPrint: boolean }) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              var auto = ${autoPrint ? "true" : "false"};
              if (!auto) return;
              setTimeout(function() { window.print(); }, 250);
            } catch (e) {}
          })();
        `,
      }}
    />
  );
}

export default async function ReceiptPage({ params }: { params: Promise<{ saleId: string }> }) {
  const ctx = await requirePermission(PERMISSIONS.sales_read);
  const p = await params;
  const sale = await prisma.sale.findFirst({
    where: { tenantId: ctx.tenantId, id: p.saleId },
    include: { items: { orderBy: { name: "asc" } }, payments: true },
  });
  if (!sale) notFound();

  const printer = await getPrinterSettings({ tenantId: ctx.tenantId });
  const width = printer.paper === "58mm" ? 58 : 80;
  const maxPx = printer.paper === "58mm" ? 360 : 520;

  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>{`Struk ${sale.invoiceNo}`}</title>
        <style>{`
          :root { color-scheme: light; }
          body { margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
          .wrap { max-width: ${maxPx}px; margin: 0 auto; padding: 16px; }
          .center { text-align: center; }
          .muted { color: #64748b; }
          .hr { border-top: 1px dashed #cbd5e1; margin: 12px 0; }
          .row { display: flex; justify-content: space-between; gap: 12px; }
          .items { margin-top: 8px; display: grid; gap: 8px; }
          .item { display: grid; gap: 2px; }
          .item-top { display: flex; justify-content: space-between; gap: 10px; }
          .small { font-size: 12px; }
          .bold { font-weight: 700; }
          @media print {
            @page { size: ${width}mm auto; margin: 0; }
            body { margin: 0; }
            .wrap { padding: 10px; }
            .no-print { display: none !important; }
          }
        `}</style>
      </head>
      <body>
        <ReceiptPrintScript autoPrint={printer.autoPrintAfterPayment} />
        <div className="wrap">
          <div className="center">
            <div className="bold">{printer.headerTitle}</div>
            {printer.headerSubtitle ? <div className="small muted">{printer.headerSubtitle}</div> : null}
          </div>

          <div className="hr" />

          <div className="small">
            <div className="row">
              <span>Invoice</span>
              <span className="bold">{sale.invoiceNo}</span>
            </div>
            <div className="row">
              <span>Waktu</span>
              <span>{new Date(sale.createdAt).toLocaleString("id-ID")}</span>
            </div>
            <div className="row">
              <span>Status</span>
              <span>{sale.status}</span>
            </div>
          </div>

          <div className="hr" />

          <div className="items small">
            {sale.items.map((i) => (
              <div key={i.id} className="item">
                <div className="item-top">
                  <div className="bold" style={{ flex: 1, minWidth: 0 }}>
                    {i.name}
                  </div>
                  <div className="bold">{rupiah(i.lineTotal)}</div>
                </div>
                <div className="muted">{`${i.qty} x ${rupiah(i.price)}`}</div>
              </div>
            ))}
          </div>

          <div className="hr" />

          <div className="small">
            <div className="row">
              <span>Subtotal</span>
              <span>{rupiah(sale.subtotal)}</span>
            </div>
            {printer.showDiscount ? (
              <div className="row">
                <span>Diskon</span>
                <span>{rupiah(sale.discount)}</span>
              </div>
            ) : null}
            {printer.showTax ? (
              <div className="row">
                <span>Pajak</span>
                <span>{rupiah(sale.tax)}</span>
              </div>
            ) : null}
            <div className="row bold" style={{ marginTop: 8, fontSize: 14 }}>
              <span>Total</span>
              <span>{rupiah(sale.total)}</span>
            </div>
          </div>

          <div className="hr" />

          <div className="small">
            <div className="bold" style={{ marginBottom: 6 }}>
              Pembayaran
            </div>
            {sale.payments.length === 0 ? (
              <div className="muted">-</div>
            ) : (
              sale.payments.map((p) => (
                <div key={p.id} className="row">
                  <span>{p.method}</span>
                  <span>{rupiah(p.amount)}</span>
                </div>
              ))
            )}
          </div>

          <div className="hr" />

          <div className="center small muted">{printer.footerNote}</div>

          <div className="no-print" style={{ marginTop: 14, display: "flex", justifyContent: "center", gap: 8 }}>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.print();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #cbd5e1",
                borderRadius: 12,
                padding: "10px 14px",
                textDecoration: "none",
                color: "#0f172a",
                fontSize: 12,
              }}
            >
              Print
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
