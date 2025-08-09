-- CreateTable
CREATE TABLE "public"."Message" (
    "id" TEXT NOT NULL,
    "gmailId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "internalDate" TIMESTAMP(3) NOT NULL,
    "labels" TEXT[],
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Message_gmailId_key" ON "public"."Message"("gmailId");

-- CreateIndex
CREATE INDEX "Message_userId_internalDate_idx" ON "public"."Message"("userId", "internalDate");

-- CreateIndex
CREATE INDEX "Message_threadId_idx" ON "public"."Message"("threadId");

-- CreateIndex
CREATE INDEX "EmailLog_userId_timestamp_idx" ON "public"."EmailLog"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "EmailLog_messageId_idx" ON "public"."EmailLog"("messageId");

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailLog" ADD CONSTRAINT "EmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
