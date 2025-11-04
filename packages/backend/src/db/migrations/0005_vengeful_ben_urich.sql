ALTER TABLE "kanbans" ADD COLUMN "threshold_rules" jsonb DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "column_entered_at" timestamp DEFAULT now() NOT NULL;