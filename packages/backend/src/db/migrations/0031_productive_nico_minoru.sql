CREATE TABLE IF NOT EXISTS "stored_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kanban_id" uuid NOT NULL,
	"product_id" uuid,
	"product_details" text NOT NULL,
	"sku" text,
	"quantity" integer,
	"unit" text,
	"stock_level" integer,
	"category" text,
	"supplier" text,
	"removal_type" text DEFAULT 'auto' NOT NULL,
	"removal_reason" text,
	"stored_at" timestamp NOT NULL,
	"removed_at" timestamp DEFAULT now() NOT NULL,
	"product_snapshot" jsonb DEFAULT '{}',
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kanbans" ADD COLUMN "stored_auto_archive_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "kanbans" ADD COLUMN "stored_auto_archive_after_hours" integer;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stored_logs_kanban_id_idx" ON "stored_logs" ("kanban_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stored_logs_removal_type_idx" ON "stored_logs" ("removal_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stored_logs_removed_at_idx" ON "stored_logs" ("removed_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stored_logs" ADD CONSTRAINT "stored_logs_kanban_id_kanbans_id_fk" FOREIGN KEY ("kanban_id") REFERENCES "kanbans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stored_logs" ADD CONSTRAINT "stored_logs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
