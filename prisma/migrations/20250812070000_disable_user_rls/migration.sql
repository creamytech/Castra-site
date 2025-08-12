-- Relax RLS on User to allow NextAuth to create and read users
DO $$ BEGIN
  ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL; END $$;

DROP POLICY IF EXISTS user_is_self ON "User";


