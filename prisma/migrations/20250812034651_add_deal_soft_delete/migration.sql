-- AlterTable
ALTER TABLE "public"."Deal" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "lastOutreachAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Deal_userId_deletedAt_idx" ON "public"."Deal"("userId", "deletedAt");
