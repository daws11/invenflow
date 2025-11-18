ALTER TABLE "kanbans" ADD COLUMN "stored_auto_archive_after_minutes" integer;--> statement-breakpoint
ALTER TABLE "kanbans" DROP COLUMN IF EXISTS "stored_auto_archive_after_hours";