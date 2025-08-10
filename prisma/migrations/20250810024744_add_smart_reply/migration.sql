-- CreateTable
CREATE TABLE "public"."SmartReply" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "gmailDraftId" TEXT,
    "subject" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'suggested',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmartReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmartReply_userId_status_createdAt_idx" ON "public"."SmartReply"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SmartReply_messageId_idx" ON "public"."SmartReply"("messageId");

-- AddForeignKey
ALTER TABLE "public"."SmartReply" ADD CONSTRAINT "SmartReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SmartReply" ADD CONSTRAINT "SmartReply_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
