ALTER TABLE "locations" ADD COLUMN "type" text DEFAULT 'physical' NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "locations_type_idx" ON "locations" ("type");