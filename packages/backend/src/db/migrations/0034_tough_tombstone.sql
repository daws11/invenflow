ALTER TABLE "movement_logs" ADD COLUMN "requires_confirmation" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "movement_logs" ADD COLUMN "status" text DEFAULT 'received' NOT NULL;--> statement-breakpoint
ALTER TABLE "movement_logs" ADD COLUMN "public_token" text;--> statement-breakpoint
ALTER TABLE "movement_logs" ADD COLUMN "token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "movement_logs" ADD COLUMN "confirmed_by" text;--> statement-breakpoint
ALTER TABLE "movement_logs" ADD COLUMN "confirmed_at" timestamp;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "movement_logs_public_token_idx" ON "movement_logs" ("public_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "movement_logs_status_idx" ON "movement_logs" ("status");