-- CreateEnum
CREATE TYPE "public"."DealStage" AS ENUM ('LEAD', 'QUALIFIED', 'SHOWING', 'OFFER', 'ESCROW', 'CLOSED', 'LOST');

-- CreateEnum
CREATE TYPE "public"."DealType" AS ENUM ('BUYER', 'SELLER', 'RENTAL');

-- CreateEnum
CREATE TYPE "public"."ActivityKind" AS ENUM ('NOTE', 'EMAIL', 'SMS', 'IGDM', 'CALL', 'MEETING', 'FILE', 'AI_SUMMARY');

-- AlterTable
ALTER TABLE "public"."Deal" ADD COLUMN     "city" TEXT,
ADD COLUMN     "mlsId" TEXT,
ADD COLUMN     "nextAction" TEXT,
ADD COLUMN     "nextDue" TIMESTAMP(3),
ADD COLUMN     "priceTarget" INTEGER,
ADD COLUMN     "propertyAddr" TEXT,
ADD COLUMN     "stage" "public"."DealStage" NOT NULL DEFAULT 'LEAD',
ADD COLUMN     "state" TEXT,
ADD COLUMN     "type" "public"."DealType" NOT NULL DEFAULT 'BUYER';

-- CreateTable
CREATE TABLE "public"."DealContact" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "role" TEXT,

    CONSTRAINT "DealContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Activity" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "public"."ActivityKind" NOT NULL,
    "channel" TEXT,
    "subject" TEXT,
    "body" TEXT,
    "meta" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DealContact_dealId_idx" ON "public"."DealContact"("dealId");

-- CreateIndex
CREATE INDEX "DealContact_contactId_idx" ON "public"."DealContact"("contactId");

-- CreateIndex
CREATE INDEX "Activity_dealId_occurredAt_idx" ON "public"."Activity"("dealId", "occurredAt");

-- CreateIndex
CREATE INDEX "Activity_userId_occurredAt_idx" ON "public"."Activity"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "Deal_userId_stage_idx" ON "public"."Deal"("userId", "stage");

-- AddForeignKey
ALTER TABLE "public"."DealContact" ADD CONSTRAINT "DealContact_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealContact" ADD CONSTRAINT "DealContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
