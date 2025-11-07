CREATE TABLE IF NOT EXISTS "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "departments_name_unique" UNIQUE("name")
);
--> statement-breakpoint
DROP INDEX IF EXISTS "persons_department_idx";--> statement-breakpoint
ALTER TABLE "bulk_movements" ADD COLUMN "cancelled_at" timestamp;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "department_id" uuid NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "departments_name_idx" ON "departments" ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "departments_is_active_idx" ON "departments" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "persons_department_id_idx" ON "persons" ("department_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "persons" ADD CONSTRAINT "persons_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "persons" DROP COLUMN IF EXISTS "department";