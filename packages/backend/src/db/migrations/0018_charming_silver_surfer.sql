CREATE TABLE IF NOT EXISTS "stock_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" text,
	"location_id" uuid,
	"category" text,
	"alert_type" text NOT NULL,
	"threshold" integer NOT NULL,
	"is_active" text DEFAULT 'true' NOT NULL,
	"notification_email" text,
	"last_triggered" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"location_id" uuid,
	"sku" text,
	"stock_level" integer NOT NULL,
	"column_status" text NOT NULL,
	"snapshot_date" timestamp DEFAULT now() NOT NULL,
	"snapshot_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_alerts_sku_idx" ON "stock_alerts" ("sku");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_alerts_location_id_idx" ON "stock_alerts" ("location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_alerts_category_idx" ON "stock_alerts" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_alerts_type_idx" ON "stock_alerts" ("alert_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_alerts_active_idx" ON "stock_alerts" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_snapshots_product_id_idx" ON "stock_snapshots" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_snapshots_location_id_idx" ON "stock_snapshots" ("location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_snapshots_sku_idx" ON "stock_snapshots" ("sku");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_snapshots_date_idx" ON "stock_snapshots" ("snapshot_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_snapshots_type_idx" ON "stock_snapshots" ("snapshot_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_snapshots_location_date_idx" ON "stock_snapshots" ("location_id","snapshot_date");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_snapshots" ADD CONSTRAINT "stock_snapshots_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_snapshots" ADD CONSTRAINT "stock_snapshots_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
