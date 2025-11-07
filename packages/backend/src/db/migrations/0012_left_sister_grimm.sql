CREATE TABLE IF NOT EXISTS "bulk_movement_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bulk_movement_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity_sent" integer NOT NULL,
	"quantity_received" integer,
	"sku" text,
	"product_details" text NOT NULL,
	"product_image" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bulk_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_location_id" uuid NOT NULL,
	"to_location_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"public_token" text NOT NULL,
	"token_expires_at" timestamp NOT NULL,
	"created_by" text NOT NULL,
	"confirmed_by" text,
	"confirmed_at" timestamp,
	"cancelled_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bulk_movements_public_token_unique" UNIQUE("public_token")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bulk_movement_items_bulk_movement_id_idx" ON "bulk_movement_items" ("bulk_movement_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bulk_movement_items_product_id_idx" ON "bulk_movement_items" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bulk_movement_items_sku_idx" ON "bulk_movement_items" ("sku");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bulk_movements_from_location_id_idx" ON "bulk_movements" ("from_location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bulk_movements_to_location_id_idx" ON "bulk_movements" ("to_location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bulk_movements_status_idx" ON "bulk_movements" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bulk_movements_public_token_idx" ON "bulk_movements" ("public_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bulk_movements_token_expires_at_idx" ON "bulk_movements" ("token_expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bulk_movements_created_at_idx" ON "bulk_movements" ("created_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bulk_movement_items" ADD CONSTRAINT "bulk_movement_items_bulk_movement_id_bulk_movements_id_fk" FOREIGN KEY ("bulk_movement_id") REFERENCES "bulk_movements"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bulk_movement_items" ADD CONSTRAINT "bulk_movement_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bulk_movements" ADD CONSTRAINT "bulk_movements_from_location_id_locations_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "locations"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bulk_movements" ADD CONSTRAINT "bulk_movements_to_location_id_locations_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "locations"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
