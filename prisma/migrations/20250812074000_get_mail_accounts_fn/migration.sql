CREATE OR REPLACE FUNCTION app.get_mail_accounts(p_user_id text)
RETURNS TABLE (id text, provider text, providerUserId text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT "id"::text, "provider", "providerUserId" FROM "MailAccount" WHERE "userId" = p_user_id;
$$;


