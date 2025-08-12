CREATE OR REPLACE FUNCTION app.link_mail_account(p_user_id text, p_provider text, p_provider_user_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id text := encode(gen_random_bytes(12), 'hex');
BEGIN
  INSERT INTO "MailAccount" ("id", "userId", "provider", "providerUserId", "refreshTokenEnc", "createdAt", "updatedAt")
  VALUES (v_id, p_user_id, p_provider, p_provider_user_id, '\\x'::bytea, now(), now())
  ON CONFLICT ("providerUserId") DO UPDATE SET "userId" = EXCLUDED."userId", "updatedAt" = now();
END;
$$;


