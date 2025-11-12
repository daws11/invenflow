ALTER TABLE "products" ADD COLUMN "is_draft" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_is_draft_idx" ON "products" ("is_draft");