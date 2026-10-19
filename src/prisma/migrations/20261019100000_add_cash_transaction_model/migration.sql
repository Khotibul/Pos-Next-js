-- Tabel kas mobile (income/expense dalam shift).
-- Sebelumnya endpoint POST /api/mobile/cash-transactions hanya stub tanpa
-- tabel: perangkat menandai data tersinkron tetapi tidak pernah tersimpan
-- di database (data kas tidak terlihat dari web).
-- Idempotent (IF NOT EXISTS) — aman dijalankan ulang.

-- CreateTable
CREATE TABLE IF NOT EXISTS "CashTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shiftId" TEXT,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "description" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CashTransaction_tenantId_transactionDate_idx" ON "CashTransaction"("tenantId", "transactionDate");
CREATE INDEX IF NOT EXISTS "CashTransaction_tenantId_shiftId_idx" ON "CashTransaction"("tenantId", "shiftId");
CREATE INDEX IF NOT EXISTS "CashTransaction_tenantId_type_idx" ON "CashTransaction"("tenantId", "type");

-- AddForeignKey: tenant (Cascade)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CashTransaction_tenantId_fkey') THEN
    ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey: user (Restrict) — userId diambil dari token, selalu valid
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CashTransaction_userId_fkey') THEN
    ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
