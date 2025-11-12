ALTER TABLE "kanbans" ADD COLUMN "default_linked_kanban_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "preferred_receive_kanban_id" uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_preferred_receive_kanban_id_idx" ON "products" ("preferred_receive_kanban_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kanbans" ADD CONSTRAINT "kanbans_default_linked_kanban_id_fkey" FOREIGN KEY ("default_linked_kanban_id") REFERENCES "kanbans"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_preferred_receive_kanban_id_kanbans_id_fk" FOREIGN KEY ("preferred_receive_kanban_id") REFERENCES "kanbans"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
