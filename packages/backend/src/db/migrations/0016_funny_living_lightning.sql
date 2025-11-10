CREATE TABLE IF NOT EXISTS "kanban_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_kanban_id" uuid NOT NULL,
	"receive_kanban_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kanbans" ADD COLUMN "location_id" uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kanban_links_order_kanban_id_idx" ON "kanban_links" ("order_kanban_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kanban_links_receive_kanban_id_idx" ON "kanban_links" ("receive_kanban_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "kanban_links_unique_link_idx" ON "kanban_links" ("order_kanban_id","receive_kanban_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kanbans_location_id_idx" ON "kanbans" ("location_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kanbans" ADD CONSTRAINT "kanbans_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kanban_links" ADD CONSTRAINT "kanban_links_order_kanban_id_kanbans_id_fk" FOREIGN KEY ("order_kanban_id") REFERENCES "kanbans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kanban_links" ADD CONSTRAINT "kanban_links_receive_kanban_id_kanbans_id_fk" FOREIGN KEY ("receive_kanban_id") REFERENCES "kanbans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
