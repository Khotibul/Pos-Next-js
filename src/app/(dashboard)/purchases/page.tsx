import { PageHeader } from "@/components/layout/page-header";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { listPurchaseOrders, listSuppliersForSelect } from "@/modules/purchases/service";
import { PurchaseOrdersTable } from "@/modules/purchases/components/purchase-orders-table";

export default async function PurchasesPage() {
  const ctx = await requirePermission(PERMISSIONS.inventory_read);
  const [items, suppliers] = await Promise.all([
    listPurchaseOrders({ tenantId: ctx.tenantId }),
    listSuppliersForSelect({ tenantId: ctx.tenantId }),
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader title="Pembelian" description="Kelola purchase order (PO) dan penerimaan barang." />
      <PurchaseOrdersTable
        suppliers={suppliers}
        items={items.map((po) => ({
          id: po.id,
          orderNo: po.orderNo,
          status: po.status,
          supplierId: po.supplierId ?? null,
          supplierName: po.supplier?.name ?? null,
          notes: po.notes ?? null,
          itemCount: po._count.items,
          createdAt: po.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
