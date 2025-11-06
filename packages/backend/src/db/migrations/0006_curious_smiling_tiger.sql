CREATE TABLE IF NOT EXISTS "movement_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"from_location_id" uuid,
	"to_location_id" uuid NOT NULL,
	"from_stock_level" integer,
	"to_stock_level" integer NOT NULL,
	"notes" text,
	"moved_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "movement_logs_product_id_idx" ON "movement_logs" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "movement_logs_from_location_id_idx" ON "movement_logs" ("from_location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "movement_logs_to_location_id_idx" ON "movement_logs" ("to_location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "movement_logs_created_at_idx" ON "movement_logs" ("created_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "movement_logs" ADD CONSTRAINT "movement_logs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "movement_logs" ADD CONSTRAINT "movement_logs_from_location_id_locations_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "locations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "movement_logs" ADD CONSTRAINT "movement_logs_to_location_id_locations_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "locations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
