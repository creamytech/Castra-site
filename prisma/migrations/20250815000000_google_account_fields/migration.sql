-- Add Gmail incremental sync fields and timestamps to NextAuth Account
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "gmailHistoryId" TEXT;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "gmailEmailAddress" TEXT;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update updatedAt on write trigger (Postgres example; adjust if using Prisma-managed updatedAt)
-- Note: Prisma will manage @updatedAt in schema, so this is optional.

