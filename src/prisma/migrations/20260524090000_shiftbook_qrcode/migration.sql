-- Shiftbook + QR Code support

-- 1) Extend ShiftStatus enum (PostgreSQL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'ShiftStatus' AND e.enumlabel = 'APPROVED'
  ) THEN
    ALTER TYPE "ShiftStatus" ADD VALUE 'APPROVED';
  END IF;
END
$$;

-- 2) Product.qrCode
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "qrCode" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema() AND indexname = 'Product_qrCode_idx'
  ) THEN
    CREATE INDEX "Product_qrCode_idx" ON "Product"("qrCode");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema() AND indexname = 'Product_tenantId_qrCode_key'
  ) THEN
    CREATE UNIQUE INDEX "Product_tenantId_qrCode_key" ON "Product"("tenantId","qrCode");
  END IF;
END
$$;

-- 3) Sale.shiftId -> CashierShift
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "shiftId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema() AND indexname = 'Sale_shiftId_idx'
  ) THEN
    CREATE INDEX "Sale_shiftId_idx" ON "Sale"("shiftId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Sale_shiftId_fkey'
  ) THEN
    ALTER TABLE "Sale"
      ADD CONSTRAINT "Sale_shiftId_fkey"
      FOREIGN KEY ("shiftId") REFERENCES "CashierShift"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- 4) CashierShift columns for Shiftbook
ALTER TABLE "CashierShift" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "CashierShift" ADD COLUMN IF NOT EXISTS "cashSystem" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "CashierShift" ADD COLUMN IF NOT EXISTS "cashCounted" DECIMAL(65,30);
ALTER TABLE "CashierShift" ADD COLUMN IF NOT EXISTS "cashDifference" DECIMAL(65,30) NOT NULL DEFAULT 0;

ALTER TABLE "CashierShift" ADD COLUMN IF NOT EXISTS "totalSales" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "CashierShift" ADD COLUMN IF NOT EXISTS "totalCash" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "CashierShift" ADD COLUMN IF NOT EXISTS "totalQris" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "CashierShift" ADD COLUMN IF NOT EXISTS "totalTransfer" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "CashierShift" ADD COLUMN IF NOT EXISTS "totalEwallet" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "CashierShift" ADD COLUMN IF NOT EXISTS "transactionCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "CashierShift" ADD COLUMN IF NOT EXISTS "openNote" TEXT;
ALTER TABLE "CashierShift" ADD COLUMN IF NOT EXISTS "closeNote" TEXT;
ALTER TABLE "CashierShift" ADD COLUMN IF NOT EXISTS "approvedById" TEXT;
ALTER TABLE "CashierShift" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);

ALTER TABLE "CashierShift" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "CashierShift" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Best-effort data migration from old columns (if present)
-- - "note" -> "openNote"/"closeNote"
-- - "closingCash" -> "cashCounted"
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'CashierShift'
      AND column_name = 'note'
  ) THEN
    UPDATE "CashierShift"
    SET "openNote" = COALESCE("openNote", "note"),
        "closeNote" = COALESCE("closeNote", "note")
    WHERE "note" IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'CashierShift'
      AND column_name = 'closingCash'
  ) THEN
    UPDATE "CashierShift"
    SET "cashCounted" = COALESCE("cashCounted", "closingCash")
    WHERE "cashCounted" IS NULL;
  END IF;
END
$$;

-- Ensure branchId is populated for existing rows (derive from TenantUser, then fallback to first branch in tenant)
UPDATE "CashierShift" cs
SET "branchId" = tu."branchId"
FROM "TenantUser" tu
WHERE cs."branchId" IS NULL
  AND tu."tenantId" = cs."tenantId"
  AND tu."userId" = cs."cashierUserId"
  AND tu."branchId" IS NOT NULL;

UPDATE "CashierShift" cs
SET "branchId" = (
  SELECT b."id"
  FROM "Branch" b
  WHERE b."tenantId" = cs."tenantId"
  ORDER BY b."createdAt" ASC
  LIMIT 1
)
WHERE cs."branchId" IS NULL;

-- Now enforce NOT NULL for branchId (required by Prisma model)
ALTER TABLE "CashierShift" ALTER COLUMN "branchId" SET NOT NULL;

-- Foreign keys + indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CashierShift_branchId_fkey') THEN
    ALTER TABLE "CashierShift"
      ADD CONSTRAINT "CashierShift_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CashierShift_approvedById_fkey') THEN
    ALTER TABLE "CashierShift"
      ADD CONSTRAINT "CashierShift_approvedById_fkey"
      FOREIGN KEY ("approvedById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema() AND indexname = 'CashierShift_branchId_idx'
  ) THEN
    CREATE INDEX "CashierShift_branchId_idx" ON "CashierShift"("branchId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema() AND indexname = 'CashierShift_approvedById_idx'
  ) THEN
    CREATE INDEX "CashierShift_approvedById_idx" ON "CashierShift"("approvedById");
  END IF;
END
$$;

