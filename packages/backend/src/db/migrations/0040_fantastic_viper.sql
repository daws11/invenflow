CREATE TABLE IF NOT EXISTS "kanban_user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kanban_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kanban_user_roles_kanban_id_idx" ON "kanban_user_roles" ("kanban_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kanban_user_roles_user_id_idx" ON "kanban_user_roles" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "kanban_user_roles_kanban_id_user_id_uniq" ON "kanban_user_roles" ("kanban_id","user_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kanban_user_roles" ADD CONSTRAINT "kanban_user_roles_kanban_id_kanbans_id_fk" FOREIGN KEY ("kanban_id") REFERENCES "kanbans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kanban_user_roles" ADD CONSTRAINT "kanban_user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
