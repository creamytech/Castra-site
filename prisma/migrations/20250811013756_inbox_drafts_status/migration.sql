-- AlterTable
ALTER TABLE "public"."Activity" ALTER COLUMN "orgId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."AutonomyPolicy" ALTER COLUMN "orgId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Contact" ALTER COLUMN "orgId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Deal" ALTER COLUMN "orgId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."EmailMessage" ALTER COLUMN "orgId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."EmailThread" ADD COLUMN     "extracted" JSONB,
ADD COLUMN     "reasons" JSONB,
ADD COLUMN     "score" INTEGER,
ADD COLUMN     "status" TEXT,
ALTER COLUMN "orgId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."EventSuggestion" ALTER COLUMN "orgId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Interaction" ALTER COLUMN "orgId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Lead" ADD COLUMN     "providerMsgId" TEXT,
ADD COLUMN     "threadId" TEXT,
ALTER COLUMN "orgId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Notification" ALTER COLUMN "orgId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."SmartReply" ALTER COLUMN "orgId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Task" ALTER COLUMN "orgId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Template" ALTER COLUMN "orgId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."ToneEmbedding" ALTER COLUMN "orgId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."UserProfile" ALTER COLUMN "orgId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."Draft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "followupType" TEXT,
    "tone" TEXT,
    "callToAction" TEXT,
    "proposedTimes" JSONB,
    "meta" JSONB,
    "snoozeUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Draft_userId_status_snoozeUntil_idx" ON "public"."Draft"("userId", "status", "snoozeUntil");

-- CreateIndex
CREATE UNIQUE INDEX "Draft_userId_leadId_threadId_status_key" ON "public"."Draft"("userId", "leadId", "threadId", "status");

-- AddForeignKey
ALTER TABLE "public"."Draft" ADD CONSTRAINT "Draft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Draft" ADD CONSTRAINT "Draft_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
