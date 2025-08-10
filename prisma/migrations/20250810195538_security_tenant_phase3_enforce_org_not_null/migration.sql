-- Enforce NOT NULL on orgId columns (after backfill)
ALTER TABLE "public"."Deal" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "public"."Contact" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "public"."Lead" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "public"."EmailThread" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "public"."EmailMessage" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "public"."Task" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "public"."Interaction" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "public"."UserProfile" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "public"."Template" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "public"."ToneEmbedding" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "public"."SmartReply" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "public"."Notification" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "public"."EventSuggestion" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "public"."AutonomyPolicy" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "public"."Activity" ALTER COLUMN "orgId" SET NOT NULL;
-- This is an empty migration.