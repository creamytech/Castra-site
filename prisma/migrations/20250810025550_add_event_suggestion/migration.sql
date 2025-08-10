-- CreateTable
CREATE TABLE "public"."EventSuggestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "startISO" TEXT NOT NULL,
    "endISO" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'America/New_York',
    "attendees" TEXT[],
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'suggested',
    "createdEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventSuggestion_userId_status_createdAt_idx" ON "public"."EventSuggestion"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "EventSuggestion_messageId_idx" ON "public"."EventSuggestion"("messageId");

-- AddForeignKey
ALTER TABLE "public"."EventSuggestion" ADD CONSTRAINT "EventSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventSuggestion" ADD CONSTRAINT "EventSuggestion_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
