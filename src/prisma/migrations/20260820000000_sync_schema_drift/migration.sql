-- DropIndex
DROP INDEX "AuditLog_tenantId_createdAt_idx";

-- DropIndex
DROP INDEX "AuditLog_tenantId_idx";

-- DropIndex
DROP INDEX "idx_customer_name_trgm";

-- DropIndex
DROP INDEX "idx_product_name_trgm";

-- DropIndex
DROP INDEX "idx_product_sku_trgm";

-- DropIndex
DROP INDEX "Sale_createdAt_idx";

-- DropIndex
DROP INDEX "idx_supplier_name_trgm";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "changeAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "receivedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "wholesaleDiscountPercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "wholesaleMinQty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wholesalePrice" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Printer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'BLUETOOTH',
    "paperSize" TEXT NOT NULL DEFAULT '58mm',
    "address" TEXT,
    "configJson" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Printer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Printer_tenantId_idx" ON "Printer"("tenantId");

-- CreateIndex
CREATE INDEX "Printer_branchId_idx" ON "Printer"("branchId");

-- CreateIndex
CREATE INDEX "Announcement_status_idx" ON "Announcement"("status");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Customer_createdAt_idx" ON "Customer"("createdAt");

-- CreateIndex
CREATE INDEX "Product_tenantId_isActive_idx" ON "Product"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "Sale_tenantId_createdAt_idx" ON "Sale"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Sale_invoiceNo_idx" ON "Sale"("invoiceNo");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "Warehouse_tenantId_isActive_idx" ON "Warehouse"("tenantId", "isActive");

-- AddForeignKey
ALTER TABLE "Printer" ADD CONSTRAINT "Printer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Printer" ADD CONSTRAINT "Printer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
