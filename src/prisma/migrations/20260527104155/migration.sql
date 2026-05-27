-- AlterTable
ALTER TABLE "ProductBatch" ADD COLUMN     "batchNumber" TEXT,
ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "confidence" DECIMAL(65,30),
ADD COLUMN     "costPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "expiredDate" TIMESTAMP(3),
ADD COLUMN     "ocrText" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "quantity" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "warehouseId" TEXT,
ALTER COLUMN "batchNo" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ProductBatch_branchId_idx" ON "ProductBatch"("branchId");

-- CreateIndex
CREATE INDEX "ProductBatch_warehouseId_idx" ON "ProductBatch"("warehouseId");

-- CreateIndex
CREATE INDEX "ProductBatch_expiredDate_idx" ON "ProductBatch"("expiredDate");

-- CreateIndex
CREATE INDEX "ProductBatch_batchNumber_idx" ON "ProductBatch"("batchNumber");

-- AddForeignKey
ALTER TABLE "ProductBatch" ADD CONSTRAINT "ProductBatch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBatch" ADD CONSTRAINT "ProductBatch_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
