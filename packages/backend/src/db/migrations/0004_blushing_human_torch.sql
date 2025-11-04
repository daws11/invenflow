ALTER TABLE "kanbans" DROP CONSTRAINT "kanbans_linked_kanban_id_kanbans_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kanbans" ADD CONSTRAINT "kanbans_linked_kanban_id_fkey" FOREIGN KEY ("linked_kanban_id") REFERENCES "kanbans"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
