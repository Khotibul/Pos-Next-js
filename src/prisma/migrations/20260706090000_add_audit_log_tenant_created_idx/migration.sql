-- Add composite index for audit log queries (tenantId + createdAt DESC)
CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_createdAt_idx"
  ON "AuditLog" ("tenantId", "createdAt" DESC);
