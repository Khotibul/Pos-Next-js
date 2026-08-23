-- CreateIndex for POS performance
CREATE INDEX IF NOT EXISTS "ProductWarehouseStock_tenantId_productId_idx" ON "ProductWarehouseStock"("tenantId", "productId");
CREATE INDEX IF NOT EXISTS "ProductWarehouseStock_tenantId_warehouseId_idx" ON "ProductWarehouseStock"("tenantId", "warehouseId");
CREATE INDEX IF NOT EXISTS "ProductWarehouseStock_tenantId_productId_warehouseId_idx" ON "ProductWarehouseStock"("tenantId", "productId", "warehouseId");
CREATE INDEX IF NOT EXISTS "CashierShift_tenantId_branchId_cashierId_status_idx" ON "CashierShift"("tenantId", "branchId", "cashierUserId", "status");
CREATE INDEX IF NOT EXISTS "Sale_tenantId_shiftId_idx" ON "Sale"("tenantId", "shiftId");
