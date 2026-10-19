-- Idempotent version: disesuaikan dengan kondisi DB produksi yang sudah
-- drift (kolom wholesale/Payment/User.isActive sudah ada, sebagian index
-- sudah tidak ada). Aman dijalankan berulang via `prisma migrate deploy`.

-- DropIndex
DROP INDEX IF EXISTS "AuditLog_tenantId_createdAt_idx";

-- DropIndex
DROP INDEX IF EXISTS "AuditLog_tenantId_idx";

-- DropIndex
DROP INDEX IF EXISTS "idx_customer_name_trgm";

-- DropIndex
DROP INDEX IF EXISTS "idx_product_name_trgm";

-- DropIndex
DROP INDEX IF EXISTS "idx_product_sku_trgm";

-- DropIndex
DROP INDEX IF EXISTS "Sale_createdAt_idx";

-- DropIndex
DROP INDEX IF EXISTS "idx_supplier_name_trgm";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "changeAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "receivedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "wholesaleDiscountPercent" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "wholesaleMinQty" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "wholesalePrice" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Printer" (
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
CREATE INDEX IF NOT EXISTS "Printer_tenantId_idx" ON "Printer"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Printer_branchId_idx" ON "Printer"("branchId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Announcement_status_idx" ON "Announcement"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Customer_createdAt_idx" ON "Customer"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_tenantId_isActive_idx" ON "Product"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Sale_tenantId_createdAt_idx" ON "Sale"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Sale_invoiceNo_idx" ON "Sale"("invoiceNo");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Warehouse_tenantId_isActive_idx" ON "Warehouse"("tenantId", "isActive");

-- AddForeignKey (toleran bila constraint sudah ada)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Printer_tenantId_fkey') THEN
    ALTER TABLE "Printer" ADD CONSTRAINT "Printer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Printer_branchId_fkey') THEN
    ALTER TABLE "Printer" ADD CONSTRAINT "Printer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
