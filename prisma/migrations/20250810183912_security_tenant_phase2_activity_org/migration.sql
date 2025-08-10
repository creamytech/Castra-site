-- AlterTable
ALTER TABLE "public"."Activity" ADD COLUMN     "orgId" TEXT;

-- CreateIndex
CREATE INDEX "Activity_orgId_occurredAt_idx" ON "public"."Activity"("orgId", "occurredAt");

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Org"("id") ON DELETE SET NULL ON UPDATE CASCADE;
