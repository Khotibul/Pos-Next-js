-- Repair: kolom yang sudah ada di schema.prisma tetapi belum pernah
-- dimigrasikan ke database produksi (schema drift tanpa file migrasi).
-- Dampak sebelumnya: endpoint sync mobile 500 (P2022 column does not exist)
-- pada products/categories/customers/suppliers/sales.
-- Semua statement idempotent (IF NOT EXISTS) — aman dijalankan ulang.

-- ProductCategory: kategori offline (sync GET/POST /mobile/categories)
ALTER TABLE "ProductCategory" ADD COLUMN IF NOT EXISTS "description" TEXT NULL;
ALTER TABLE "ProductCategory" ADD COLUMN IF NOT EXISTS "icon" TEXT NULL;
ALTER TABLE "ProductCategory" ADD COLUMN IF NOT EXISTS "color" TEXT NULL;
ALTER TABLE "ProductCategory" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ProductCategory" ADD COLUMN IF NOT EXISTS "productCount" INTEGER NOT NULL DEFAULT 0;

-- Sale: kolom customer & catatan (sync GET/POST /mobile/sales)
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "customerId" TEXT NULL;
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "notes" TEXT NULL;

-- Customer: profil & loyalitas (sync GET/POST /mobile/customers)
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "city" TEXT NULL;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "totalPurchase" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "purchaseCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "points" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "isWholesale" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "customerType" TEXT NOT NULL DEFAULT 'RETAIL';

-- Supplier: kontak (sync GET/POST /mobile/suppliers)
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "city" TEXT NULL;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "contactPerson" TEXT NULL;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "npwp" TEXT NULL;

-- FK Sale.customerId -> Customer.id (kolom baru, seluruhnya NULL → aman)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Sale_customerId_fkey') THEN
    ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
