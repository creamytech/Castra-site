-- CreateEnum
CREATE TYPE "public"."AutonomyLevel" AS ENUM ('SUGGEST', 'ASK', 'AUTO');

-- CreateTable
CREATE TABLE "public"."LeadPreference" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "priceMin" INTEGER,
    "priceMax" INTEGER,
    "beds" INTEGER,
    "baths" INTEGER,
    "neighborhoods" TEXT,
    "timeline" TEXT,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AutonomyPolicy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stage" "public"."DealStage" NOT NULL,
    "level" "public"."AutonomyLevel" NOT NULL DEFAULT 'SUGGEST',
    "quietStart" INTEGER,
    "quietEnd" INTEGER,
    "channelCaps" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutonomyPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Task" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dealId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Interaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dealId" TEXT,
    "contactId" TEXT,
    "channel" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "meta" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadPreference_dealId_key" ON "public"."LeadPreference"("dealId");

-- CreateIndex
CREATE INDEX "AutonomyPolicy_userId_stage_idx" ON "public"."AutonomyPolicy"("userId", "stage");

-- CreateIndex
CREATE INDEX "Task_userId_runAt_idx" ON "public"."Task"("userId", "runAt");

-- CreateIndex
CREATE INDEX "Task_dealId_idx" ON "public"."Task"("dealId");

-- CreateIndex
CREATE INDEX "Task_status_runAt_idx" ON "public"."Task"("status", "runAt");

-- CreateIndex
CREATE INDEX "Interaction_userId_occurredAt_idx" ON "public"."Interaction"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "Interaction_dealId_occurredAt_idx" ON "public"."Interaction"("dealId", "occurredAt");

-- CreateIndex
CREATE INDEX "Interaction_contactId_occurredAt_idx" ON "public"."Interaction"("contactId", "occurredAt");

-- AddForeignKey
ALTER TABLE "public"."LeadPreference" ADD CONSTRAINT "LeadPreference_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AutonomyPolicy" ADD CONSTRAINT "AutonomyPolicy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Interaction" ADD CONSTRAINT "Interaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Interaction" ADD CONSTRAINT "Interaction_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Interaction" ADD CONSTRAINT "Interaction_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
