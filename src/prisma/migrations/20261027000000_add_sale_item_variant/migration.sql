-- Varian yang benar-benar terjual disimpan pada baris penjualan.
-- Harga yang diubah manual dicatat agar bisa diaudit.
ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "variantId" TEXT;
ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "variantName" TEXT;
ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "priceOverridden" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "SaleItem_variantId_idx" ON "SaleItem"("variantId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SaleItem_variantId_fkey') THEN
    ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_variantId_fkey"
      FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
