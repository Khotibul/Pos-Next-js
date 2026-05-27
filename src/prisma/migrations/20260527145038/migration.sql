-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('AMOUNT', 'PERCENT', 'BOGO', 'BUNDLE');

-- CreateTable
CREATE TABLE "ProductDiscount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "productId" TEXT,
    "categoryId" TEXT,
    "brandId" TEXT,
    "supplierId" TEXT,
    "bundleId" TEXT,
    "type" "DiscountType" NOT NULL DEFAULT 'PERCENT',
    "value" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "buyQty" INTEGER,
    "getQty" INTEGER,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductDiscount_tenantId_idx" ON "ProductDiscount"("tenantId");

-- CreateIndex
CREATE INDEX "ProductDiscount_branchId_idx" ON "ProductDiscount"("branchId");

-- CreateIndex
CREATE INDEX "ProductDiscount_productId_idx" ON "ProductDiscount"("productId");

-- CreateIndex
CREATE INDEX "ProductDiscount_categoryId_idx" ON "ProductDiscount"("categoryId");

-- CreateIndex
CREATE INDEX "ProductDiscount_brandId_idx" ON "ProductDiscount"("brandId");

-- CreateIndex
CREATE INDEX "ProductDiscount_supplierId_idx" ON "ProductDiscount"("supplierId");

-- CreateIndex
CREATE INDEX "ProductDiscount_bundleId_idx" ON "ProductDiscount"("bundleId");

-- CreateIndex
CREATE INDEX "ProductDiscount_type_idx" ON "ProductDiscount"("type");

-- CreateIndex
CREATE INDEX "ProductDiscount_isActive_idx" ON "ProductDiscount"("isActive");

-- CreateIndex
CREATE INDEX "ProductDiscount_startsAt_idx" ON "ProductDiscount"("startsAt");

-- CreateIndex
CREATE INDEX "ProductDiscount_endsAt_idx" ON "ProductDiscount"("endsAt");

-- AddForeignKey
ALTER TABLE "ProductDiscount" ADD CONSTRAINT "ProductDiscount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDiscount" ADD CONSTRAINT "ProductDiscount_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDiscount" ADD CONSTRAINT "ProductDiscount_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDiscount" ADD CONSTRAINT "ProductDiscount_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDiscount" ADD CONSTRAINT "ProductDiscount_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "ProductBrand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDiscount" ADD CONSTRAINT "ProductDiscount_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDiscount" ADD CONSTRAINT "ProductDiscount_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "ProductBundle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
