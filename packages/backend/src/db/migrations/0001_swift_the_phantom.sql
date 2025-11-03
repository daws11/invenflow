CREATE TABLE IF NOT EXISTS "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"area" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "locations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "transfer_logs" ADD COLUMN "from_location_id" uuid;--> statement-breakpoint
ALTER TABLE "transfer_logs" ADD COLUMN "to_location_id" uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "locations_area_idx" ON "locations" ("area");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "locations_code_idx" ON "locations" ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "locations_name_idx" ON "locations" ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "locations_area_name_idx" ON "locations" ("area","name");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfer_logs" ADD CONSTRAINT "transfer_logs_from_location_id_locations_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "locations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfer_logs" ADD CONSTRAINT "transfer_logs_to_location_id_locations_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "locations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
