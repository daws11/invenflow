CREATE TABLE IF NOT EXISTS "product_group_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_group_id" uuid NOT NULL,
	"unified_fields" jsonb NOT NULL,
	"unified_values" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_group_settings_product_group_id_unique" UNIQUE("product_group_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kanban_id" uuid NOT NULL,
	"group_title" text NOT NULL,
	"column_status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_rejected" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "rejected_at" timestamp;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "product_group_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "group_position" integer;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_groups_kanban_id_idx" ON "product_groups" ("kanban_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_groups_column_status_idx" ON "product_groups" ("column_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_is_rejected_idx" ON "products" ("is_rejected");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_product_group_id_idx" ON "products" ("product_group_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_group_settings" ADD CONSTRAINT "product_group_settings_product_group_id_product_groups_id_fk" FOREIGN KEY ("product_group_id") REFERENCES "product_groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_groups" ADD CONSTRAINT "product_groups_kanban_id_kanbans_id_fk" FOREIGN KEY ("kanban_id") REFERENCES "kanbans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
