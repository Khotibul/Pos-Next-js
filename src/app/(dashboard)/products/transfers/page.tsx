import { PERMISSIONS } from "@/lib/permissions-keys";
import { requirePermission } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { listProducts } from "@/modules/products/service";
import { listWarehouses } from "@/modules/products/enterprise/service";
import { TransferStockDialog } from "@/modules/products/stock/transfer-stock-dialog";

export default async function ProductTransfersPage() {
  const ctx = await requirePermission(PERMISSIONS.products_transfer);

  const [warehouses, products] = await Promise.all([
    listWarehouses({ tenantId: ctx.tenantId, branchId: ctx.branchId }),
    listProducts({ tenantId: ctx.tenantId, page: 1, pageSize: 50 }),
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader title="Transfer Stok" description="Transfer stok antar gudang/cabang dengan jejak audit." />
      <TransferStockDialog
        warehouses={warehouses.map((w) => ({
          id: w.id,
          name: w.name,
          type: w.type,
          branchName: w.branch?.name ?? null,
        }))}
        products={products.items.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          barcode: p.barcode ?? null,
        }))}
      />
    </div>
  );
}

