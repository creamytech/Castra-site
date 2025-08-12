-- Enable RLS and policies (after tables exist)
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MailAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Mailbox" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Thread" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SecureMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Label" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MessageLabel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

CREATE SCHEMA IF NOT EXISTS app;
CREATE OR REPLACE FUNCTION app.current_user_id() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.user_id', true)
$$;

DROP POLICY IF EXISTS user_is_self ON "User";
CREATE POLICY user_is_self ON "User" USING ("id" = app.current_user_id());

DROP POLICY IF EXISTS account_owner ON "MailAccount";
CREATE POLICY account_owner ON "MailAccount" USING ("userId" = app.current_user_id());

DROP POLICY IF EXISTS mailbox_owner ON "Mailbox";
CREATE POLICY mailbox_owner ON "Mailbox" USING (
  "accountId" IN (SELECT "id" FROM "MailAccount" WHERE "userId" = app.current_user_id())
);

DROP POLICY IF EXISTS thread_owner ON "Thread";
CREATE POLICY thread_owner ON "Thread" USING (
  "mailboxId" IN (SELECT "id" FROM "Mailbox" WHERE "accountId" IN (SELECT "id" FROM "MailAccount" WHERE "userId" = app.current_user_id()))
);

DROP POLICY IF EXISTS message_owner ON "SecureMessage";
CREATE POLICY message_owner ON "SecureMessage" USING (
  "threadId" IN (SELECT "id" FROM "Thread" WHERE "mailboxId" IN (SELECT "id" FROM "Mailbox" WHERE "accountId" IN (SELECT "id" FROM "MailAccount" WHERE "userId" = app.current_user_id())))
);

DROP POLICY IF EXISTS label_owner ON "Label";
CREATE POLICY label_owner ON "Label" USING (
  "mailboxId" IN (SELECT "id" FROM "Mailbox" WHERE "accountId" IN (SELECT "id" FROM "MailAccount" WHERE "userId" = app.current_user_id()))
);

DROP POLICY IF EXISTS messagelabel_owner ON "MessageLabel";
CREATE POLICY messagelabel_owner ON "MessageLabel" USING (
  "messageId" IN (SELECT "id" FROM "SecureMessage" WHERE "threadId" IN (SELECT "id" FROM "Thread" WHERE "mailboxId" IN (SELECT "id" FROM "Mailbox" WHERE "accountId" IN (SELECT "id" FROM "MailAccount" WHERE "userId" = app.current_user_id()))))
);

DROP POLICY IF EXISTS auditlog_owner ON "AuditLog";
CREATE POLICY auditlog_owner ON "AuditLog" USING ("userId" = app.current_user_id());


