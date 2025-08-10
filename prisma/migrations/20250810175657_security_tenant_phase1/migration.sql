-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'AGENT', 'VIEWER');

-- AlterTable
ALTER TABLE "public"."AutonomyPolicy" ADD COLUMN     "orgId" TEXT;

-- AlterTable
ALTER TABLE "public"."Contact" ADD COLUMN     "orgId" TEXT,
ADD COLUMN     "smsConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsConsentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."Deal" ADD COLUMN     "orgId" TEXT;

-- AlterTable
ALTER TABLE "public"."EmailMessage" ADD COLUMN     "orgId" TEXT;

-- AlterTable
ALTER TABLE "public"."EmailThread" ADD COLUMN     "orgId" TEXT;

-- AlterTable
ALTER TABLE "public"."EventSuggestion" ADD COLUMN     "orgId" TEXT;

-- AlterTable
ALTER TABLE "public"."Interaction" ADD COLUMN     "orgId" TEXT;

-- AlterTable
ALTER TABLE "public"."Lead" ADD COLUMN     "orgId" TEXT;

-- AlterTable
ALTER TABLE "public"."Notification" ADD COLUMN     "orgId" TEXT;

-- AlterTable
ALTER TABLE "public"."SmartReply" ADD COLUMN     "orgId" TEXT;

-- AlterTable
ALTER TABLE "public"."Task" ADD COLUMN     "orgId" TEXT;

-- AlterTable
ALTER TABLE "public"."Template" ADD COLUMN     "orgId" TEXT;

-- AlterTable
ALTER TABLE "public"."ToneEmbedding" ADD COLUMN     "orgId" TEXT;

-- AlterTable
ALTER TABLE "public"."UserProfile" ADD COLUMN     "orgId" TEXT;

-- CreateTable
CREATE TABLE "public"."Org" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Org_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrgMember" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'AGENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "meta" JSONB,
    "ip" TEXT,
    "ua" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrgMember_userId_idx" ON "public"."OrgMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgMember_orgId_userId_key" ON "public"."OrgMember"("orgId", "userId");

-- CreateIndex
CREATE INDEX "AuditLog_orgId_createdAt_idx" ON "public"."AuditLog"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "public"."AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AutonomyPolicy_orgId_stage_idx" ON "public"."AutonomyPolicy"("orgId", "stage");

-- CreateIndex
CREATE INDEX "Contact_orgId_idx" ON "public"."Contact"("orgId");

-- CreateIndex
CREATE INDEX "Deal_orgId_stage_idx" ON "public"."Deal"("orgId", "stage");

-- CreateIndex
CREATE INDEX "EmailMessage_orgId_date_idx" ON "public"."EmailMessage"("orgId", "date");

-- CreateIndex
CREATE INDEX "EmailThread_orgId_lastSyncedAt_idx" ON "public"."EmailThread"("orgId", "lastSyncedAt");

-- CreateIndex
CREATE INDEX "EventSuggestion_orgId_status_createdAt_idx" ON "public"."EventSuggestion"("orgId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Interaction_orgId_occurredAt_idx" ON "public"."Interaction"("orgId", "occurredAt");

-- CreateIndex
CREATE INDEX "Lead_orgId_idx" ON "public"."Lead"("orgId");

-- CreateIndex
CREATE INDEX "Notification_orgId_createdAt_idx" ON "public"."Notification"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "SmartReply_orgId_createdAt_idx" ON "public"."SmartReply"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "Task_orgId_runAt_idx" ON "public"."Task"("orgId", "runAt");

-- CreateIndex
CREATE INDEX "Template_orgId_idx" ON "public"."Template"("orgId");

-- CreateIndex
CREATE INDEX "ToneEmbedding_orgId_idx" ON "public"."ToneEmbedding"("orgId");

-- AddForeignKey
ALTER TABLE "public"."OrgMember" ADD CONSTRAINT "OrgMember_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrgMember" ADD CONSTRAINT "OrgMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailThread" ADD CONSTRAINT "EmailThread_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Org"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailMessage" ADD CONSTRAINT "EmailMessage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Org"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contact" ADD CONSTRAINT "Contact_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Org"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lead" ADD CONSTRAINT "Lead_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Org"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deal" ADD CONSTRAINT "Deal_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Org"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AutonomyPolicy" ADD CONSTRAINT "AutonomyPolicy_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Org"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Org"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Interaction" ADD CONSTRAINT "Interaction_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Org"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserProfile" ADD CONSTRAINT "UserProfile_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Org"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Template" ADD CONSTRAINT "Template_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Org"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ToneEmbedding" ADD CONSTRAINT "ToneEmbedding_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Org"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SmartReply" ADD CONSTRAINT "SmartReply_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Org"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Org"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventSuggestion" ADD CONSTRAINT "EventSuggestion_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Org"("id") ON DELETE SET NULL ON UPDATE CASCADE;
