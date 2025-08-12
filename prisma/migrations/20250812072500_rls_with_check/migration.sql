-- Add WITH CHECK to RLS policies so inserts/updates by owners are permitted
DO $$ BEGIN
  DROP POLICY IF EXISTS account_owner ON "MailAccount";
  CREATE POLICY account_owner ON "MailAccount"
    USING ("userId" = app.current_user_id())
    WITH CHECK ("userId" = app.current_user_id());

  DROP POLICY IF EXISTS mailbox_owner ON "Mailbox";
  CREATE POLICY mailbox_owner ON "Mailbox"
    USING ("accountId" IN (SELECT "id" FROM "MailAccount" WHERE "userId" = app.current_user_id()))
    WITH CHECK ("accountId" IN (SELECT "id" FROM "MailAccount" WHERE "userId" = app.current_user_id()));

  DROP POLICY IF EXISTS thread_owner ON "Thread";
  CREATE POLICY thread_owner ON "Thread"
    USING ("mailboxId" IN (SELECT "id" FROM "Mailbox" WHERE "accountId" IN (SELECT "id" FROM "MailAccount" WHERE "userId" = app.current_user_id())))
    WITH CHECK ("mailboxId" IN (SELECT "id" FROM "Mailbox" WHERE "accountId" IN (SELECT "id" FROM "MailAccount" WHERE "userId" = app.current_user_id())));

  DROP POLICY IF EXISTS message_owner ON "SecureMessage";
  CREATE POLICY message_owner ON "SecureMessage"
    USING ("threadId" IN (SELECT "id" FROM "Thread" WHERE "mailboxId" IN (SELECT "id" FROM "Mailbox" WHERE "accountId" IN (SELECT "id" FROM "MailAccount" WHERE "userId" = app.current_user_id()))))
    WITH CHECK ("threadId" IN (SELECT "id" FROM "Thread" WHERE "mailboxId" IN (SELECT "id" FROM "Mailbox" WHERE "accountId" IN (SELECT "id" FROM "MailAccount" WHERE "userId" = app.current_user_id()))));

  DROP POLICY IF EXISTS label_owner ON "Label";
  CREATE POLICY label_owner ON "Label"
    USING ("mailboxId" IN (SELECT "id" FROM "Mailbox" WHERE "accountId" IN (SELECT "id" FROM "MailAccount" WHERE "userId" = app.current_user_id())))
    WITH CHECK ("mailboxId" IN (SELECT "id" FROM "Mailbox" WHERE "accountId" IN (SELECT "id" FROM "MailAccount" WHERE "userId" = app.current_user_id())));

  DROP POLICY IF EXISTS messagelabel_owner ON "MessageLabel";
  CREATE POLICY messagelabel_owner ON "MessageLabel"
    USING ("messageId" IN (SELECT "id" FROM "SecureMessage" WHERE "threadId" IN (SELECT "id" FROM "Thread" WHERE "mailboxId" IN (SELECT "id" FROM "Mailbox" WHERE "accountId" IN (SELECT "id" FROM "MailAccount" WHERE "userId" = app.current_user_id())))))
    WITH CHECK ("messageId" IN (SELECT "id" FROM "SecureMessage" WHERE "threadId" IN (SELECT "id" FROM "Thread" WHERE "mailboxId" IN (SELECT "id" FROM "Mailbox" WHERE "accountId" IN (SELECT "id" FROM "MailAccount" WHERE "userId" = app.current_user_id())))));
END $$;


