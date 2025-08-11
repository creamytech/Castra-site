-- Indices to reduce hot query cost
CREATE INDEX IF NOT EXISTS idx_lead_agent_updated ON "Lead" ("userId", "updatedAt" DESC);
-- If you later add a score column, re-enable this
-- CREATE INDEX IF NOT EXISTS idx_lead_agent_stage_score ON "Lead" ("userId", "status", "score" DESC, "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_email_agent_received ON "EmailMessage" ("userId", "date" DESC);
-- Dedup emails by provider message id if column exists
-- ALTER TABLE "EmailMessage" ADD CONSTRAINT uniq_provider_msg UNIQUE ("id"); -- id already gmail msg id

