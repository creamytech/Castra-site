-- DropIndex
DROP INDEX "public"."idx_email_agent_received";

-- DropIndex
DROP INDEX "public"."idx_lead_agent_updated";

-- AlterTable
ALTER TABLE "public"."Deal" ADD COLUMN     "closeReason" TEXT,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."Lead" ADD COLUMN     "attrs" JSONB,
ADD COLUMN     "bodySnippet" TEXT,
ADD COLUMN     "fromEmail" TEXT,
ADD COLUMN     "fromName" TEXT,
ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "overrideStatus" TEXT,
ADD COLUMN     "reasons" JSONB,
ADD COLUMN     "score" INTEGER,
ADD COLUMN     "subject" TEXT;

-- CreateIndex
CREATE INDEX "Deal_userId_stage_position_idx" ON "public"."Deal"("userId", "stage", "position");
