-- Drop email-related tables for encrypted rebuild
-- WARNING: this is destructive. Ensure backups if needed.

-- Drop dependent tables first due to FKs
DROP TABLE IF EXISTS "SmartReply" CASCADE;
DROP TABLE IF EXISTS "EventSuggestion" CASCADE;
DROP TABLE IF EXISTS "EmailMessage" CASCADE;
DROP TABLE IF EXISTS "EmailThread" CASCADE;
DROP TABLE IF EXISTS "EmailLog" CASCADE;
DROP TABLE IF EXISTS "EmailThreadCache" CASCADE;

-- Legacy Message model
DROP TABLE IF EXISTS "Message" CASCADE;


