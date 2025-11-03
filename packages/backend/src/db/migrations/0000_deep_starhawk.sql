CREATE TABLE IF NOT EXISTS "kanbans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"linked_kanban_id" uuid,
	"public_form_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kanbans_public_form_token_unique" UNIQUE("public_form_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kanban_id" uuid NOT NULL,
	"column_status" text NOT NULL,
	"product_details" text NOT NULL,
	"product_link" text,
	"location" text,
	"priority" text,
	"stock_level" integer,
	"product_image" text,
	"category" text,
	"tags" jsonb,
	"supplier" text,
	"sku" text,
	"dimensions" text,
	"weight" numeric(10, 2),
	"unit_price" numeric(12, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transfer_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"from_kanban_id" uuid NOT NULL,
	"to_kanban_id" uuid NOT NULL,
	"from_column" text NOT NULL,
	"to_column" text NOT NULL,
	"transfer_type" text NOT NULL,
	"notes" text,
	"transferred_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kanbans_type_idx" ON "kanbans" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kanbans_public_form_token_idx" ON "kanbans" ("public_form_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_kanban_id_idx" ON "products" ("kanban_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_column_status_idx" ON "products" ("column_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_category_idx" ON "products" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_supplier_idx" ON "products" ("supplier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_sku_idx" ON "products" ("sku");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfer_logs_product_id_idx" ON "transfer_logs" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfer_logs_from_kanban_id_idx" ON "transfer_logs" ("from_kanban_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfer_logs_to_kanban_id_idx" ON "transfer_logs" ("to_kanban_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfer_logs_transfer_type_idx" ON "transfer_logs" ("transfer_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfer_logs_created_at_idx" ON "transfer_logs" ("created_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kanbans" ADD CONSTRAINT "kanbans_linked_kanban_id_kanbans_id_fk" FOREIGN KEY ("linked_kanban_id") REFERENCES "kanbans"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_kanban_id_kanbans_id_fk" FOREIGN KEY ("kanban_id") REFERENCES "kanbans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfer_logs" ADD CONSTRAINT "transfer_logs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfer_logs" ADD CONSTRAINT "transfer_logs_from_kanban_id_kanbans_id_fk" FOREIGN KEY ("from_kanban_id") REFERENCES "kanbans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfer_logs" ADD CONSTRAINT "transfer_logs_to_kanban_id_kanbans_id_fk" FOREIGN KEY ("to_kanban_id") REFERENCES "kanbans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
