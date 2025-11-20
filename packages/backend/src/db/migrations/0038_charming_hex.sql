ALTER TABLE "movement_logs" ADD COLUMN "movement_type" text DEFAULT 'transfer' NOT NULL;--> statement-breakpoint
ALTER TABLE "movement_logs" ADD COLUMN "adjustment_type" text;--> statement-breakpoint
ALTER TABLE "movement_logs" ADD COLUMN "adjustment_reason" text;--> statement-breakpoint
ALTER TABLE "movement_logs" ADD COLUMN "reference_number" text;--> statement-breakpoint
ALTER TABLE "movement_logs" ADD COLUMN "approved_by" text;--> statement-breakpoint
ALTER TABLE "movement_logs" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "movement_logs_movement_type_idx" ON "movement_logs" ("movement_type");