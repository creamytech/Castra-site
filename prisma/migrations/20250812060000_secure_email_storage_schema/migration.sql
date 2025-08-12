-- New secure email storage tables (schema first)

CREATE TABLE "MailAccount" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerUserId" TEXT NOT NULL,
  "refreshTokenEnc" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MailAccount_user_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MailAccount_providerUserId_key" ON "MailAccount"("providerUserId");
CREATE INDEX "MailAccount_userId_idx" ON "MailAccount"("userId");

CREATE TABLE "Mailbox" (
  "id" TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  CONSTRAINT "Mailbox_account_fkey" FOREIGN KEY ("accountId") REFERENCES "MailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Mailbox_accountId_idx" ON "Mailbox"("accountId");

CREATE TABLE "Thread" (
  "id" TEXT PRIMARY KEY,
  "mailboxId" TEXT NOT NULL,
  "providerThreadId" TEXT NOT NULL,
  "subjectEnc" BYTEA,
  "latestAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Thread_mailbox_fkey" FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Thread_providerThreadId_key" ON "Thread"("providerThreadId");
CREATE INDEX "Thread_mailbox_latest_idx" ON "Thread"("mailboxId", "latestAt");

CREATE TABLE "SecureMessage" (
  "id" TEXT PRIMARY KEY,
  "threadId" TEXT NOT NULL,
  "providerMessageId" TEXT NOT NULL,
  "historyId" TEXT,
  "fromEnc" BYTEA NOT NULL,
  "toEnc" BYTEA NOT NULL,
  "ccEnc" BYTEA,
  "bccEnc" BYTEA,
  "snippetEnc" BYTEA,
  "receivedAt" TIMESTAMP(3) NOT NULL,
  "hasAttachment" BOOLEAN NOT NULL DEFAULT false,
  "bodyRef" TEXT,
  CONSTRAINT "SecureMessage_thread_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SecureMessage_providerMessageId_key" ON "SecureMessage"("providerMessageId");
CREATE INDEX "SecureMessage_thread_received_idx" ON "SecureMessage"("threadId", "receivedAt");

CREATE TABLE "Label" (
  "id" TEXT PRIMARY KEY,
  "mailboxId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "externalId" TEXT,
  CONSTRAINT "Label_mailbox_fkey" FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Label_mailbox_name_key" ON "Label"("mailboxId", "name");

CREATE TABLE "MessageLabel" (
  "messageId" TEXT NOT NULL,
  "labelId" TEXT NOT NULL,
  PRIMARY KEY ("messageId", "labelId"),
  CONSTRAINT "MessageLabel_message_fkey" FOREIGN KEY ("messageId") REFERENCES "SecureMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MessageLabel_label_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE CASCADE ON UPDATE CASCADE
);


