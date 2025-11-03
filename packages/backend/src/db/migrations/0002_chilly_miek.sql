CREATE TABLE IF NOT EXISTS "product_validations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"column_status" text NOT NULL,
	"recipient_name" text NOT NULL,
	"location_id" uuid,
	"received_image" text,
	"storage_photo" text,
	"validated_by" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_validations_product_id_idx" ON "product_validations" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_validations_column_status_idx" ON "product_validations" ("column_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_validations_location_id_idx" ON "product_validations" ("location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_validations_created_at_idx" ON "product_validations" ("created_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_validations" ADD CONSTRAINT "product_validations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_validations" ADD CONSTRAINT "product_validations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
