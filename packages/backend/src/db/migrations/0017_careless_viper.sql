CREATE TABLE IF NOT EXISTS "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sku_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"legacy_sku" text,
	"legacy_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "import_source" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "import_batch_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "original_purchase_date" timestamp;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "import_batches_created_at_idx" ON "import_batches" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sku_aliases_product_id_idx" ON "sku_aliases" ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sku_aliases_legacy_sku_uidx" ON "sku_aliases" ("legacy_sku");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sku_aliases_legacy_id_uidx" ON "sku_aliases" ("legacy_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_import_batch_id_idx" ON "products" ("import_batch_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sku_aliases" ADD CONSTRAINT "sku_aliases_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
