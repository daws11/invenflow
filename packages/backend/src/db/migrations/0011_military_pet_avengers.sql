CREATE TABLE IF NOT EXISTS "persons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"department" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX IF EXISTS "locations_type_idx";--> statement-breakpoint
ALTER TABLE "movement_logs" ALTER COLUMN "to_location_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "building" text;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "floor" text;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "capacity" integer;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "movement_logs" ADD COLUMN "from_person_id" uuid;--> statement-breakpoint
ALTER TABLE "movement_logs" ADD COLUMN "to_person_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "assigned_to_person_id" uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "persons_name_idx" ON "persons" ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "persons_department_idx" ON "persons" ("department");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "persons_is_active_idx" ON "persons" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "locations_building_idx" ON "locations" ("building");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "locations_is_active_idx" ON "locations" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "movement_logs_from_person_id_idx" ON "movement_logs" ("from_person_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "movement_logs_to_person_id_idx" ON "movement_logs" ("to_person_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_location_id_idx" ON "products" ("location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_assigned_to_person_id_idx" ON "products" ("assigned_to_person_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "movement_logs" ADD CONSTRAINT "movement_logs_from_person_id_persons_id_fk" FOREIGN KEY ("from_person_id") REFERENCES "persons"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "movement_logs" ADD CONSTRAINT "movement_logs_to_person_id_persons_id_fk" FOREIGN KEY ("to_person_id") REFERENCES "persons"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_assigned_to_person_id_persons_id_fk" FOREIGN KEY ("assigned_to_person_id") REFERENCES "persons"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "locations" DROP COLUMN IF EXISTS "type";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "location";