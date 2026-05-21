-- Add LicenseKey table for serial-based tenant activation.

CREATE TABLE "LicenseKey" (
    "id" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "planId" TEXT,
    "tenantId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "redeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LicenseKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LicenseKey_serial_key" ON "LicenseKey"("serial");
CREATE UNIQUE INDEX "LicenseKey_tenantId_key" ON "LicenseKey"("tenantId");

CREATE INDEX "LicenseKey_planId_idx" ON "LicenseKey"("planId");
CREATE INDEX "LicenseKey_expiresAt_idx" ON "LicenseKey"("expiresAt");

ALTER TABLE "LicenseKey" ADD CONSTRAINT "LicenseKey_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LicenseKey" ADD CONSTRAINT "LicenseKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

