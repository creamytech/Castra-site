CREATE OR REPLACE FUNCTION app.link_mail_account(p_user_id text, p_provider text, p_provider_user_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.user_id', p_user_id, true);
  INSERT INTO "MailAccount" ("id", "userId", "provider", "providerUserId", "refreshTokenEnc", "createdAt", "updatedAt")
  VALUES (p_provider_user_id, p_user_id, p_provider, p_provider_user_id, '\\x'::bytea, now(), now())
  ON CONFLICT ("providerUserId") DO UPDATE SET "userId" = EXCLUDED."userId", "updatedAt" = now();
END;
$$;

CREATE OR REPLACE FUNCTION app.get_mail_accounts(p_user_id text)
RETURNS TABLE (id text, provider text, providerUserId text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.user_id', p_user_id, true);
  RETURN QUERY SELECT "id"::text, "provider", "providerUserId" FROM "MailAccount" WHERE "userId" = p_user_id;
END;
$$;


