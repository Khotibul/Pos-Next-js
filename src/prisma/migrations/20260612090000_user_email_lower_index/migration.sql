CREATE INDEX IF NOT EXISTS idx_user_email_lower ON "User"(LOWER(email));
