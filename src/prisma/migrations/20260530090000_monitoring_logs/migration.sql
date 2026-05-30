-- Monitoring and production hardening logs.
CREATE TABLE IF NOT EXISTS "ErrorLog" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "userId" TEXT,
  "source" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "stack" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AuthLog" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "userId" TEXT,
  "email" TEXT,
  "provider" TEXT,
  "event" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SyncLog" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "deviceId" TEXT,
  "entity" TEXT,
  "entityId" TEXT,
  "status" TEXT NOT NULL,
  "message" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ErrorLog_tenantId_idx" ON "ErrorLog"("tenantId");
CREATE INDEX IF NOT EXISTS "ErrorLog_userId_idx" ON "ErrorLog"("userId");
CREATE INDEX IF NOT EXISTS "ErrorLog_source_idx" ON "ErrorLog"("source");
CREATE INDEX IF NOT EXISTS "ErrorLog_createdAt_idx" ON "ErrorLog"("createdAt");

CREATE INDEX IF NOT EXISTS "AuthLog_tenantId_idx" ON "AuthLog"("tenantId");
CREATE INDEX IF NOT EXISTS "AuthLog_userId_idx" ON "AuthLog"("userId");
CREATE INDEX IF NOT EXISTS "AuthLog_email_idx" ON "AuthLog"("email");
CREATE INDEX IF NOT EXISTS "AuthLog_event_idx" ON "AuthLog"("event");
CREATE INDEX IF NOT EXISTS "AuthLog_createdAt_idx" ON "AuthLog"("createdAt");

CREATE INDEX IF NOT EXISTS "SyncLog_tenantId_idx" ON "SyncLog"("tenantId");
CREATE INDEX IF NOT EXISTS "SyncLog_deviceId_idx" ON "SyncLog"("deviceId");
CREATE INDEX IF NOT EXISTS "SyncLog_entity_idx" ON "SyncLog"("entity");
CREATE INDEX IF NOT EXISTS "SyncLog_status_idx" ON "SyncLog"("status");
CREATE INDEX IF NOT EXISTS "SyncLog_createdAt_idx" ON "SyncLog"("createdAt");
