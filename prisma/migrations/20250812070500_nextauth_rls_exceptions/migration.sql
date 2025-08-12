-- Ensure NextAuth tables are accessible regardless of app.user_id
DO $$ BEGIN
  ALTER TABLE "Account" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "Session" DISABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL; END $$;


