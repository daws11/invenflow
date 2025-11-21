CREATE TABLE "kanban_user_roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "kanban_id" uuid NOT NULL REFERENCES "kanbans" ("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  "created_at" timestamp WITH TIME ZONE NOT NULL DEFAULT now(),
  "updated_at" timestamp WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "kanban_user_roles_kanban_id_user_id_uniq"
  ON "kanban_user_roles" ("kanban_id", "user_id");

CREATE INDEX "kanban_user_roles_kanban_id_idx" ON "kanban_user_roles" ("kanban_id");
CREATE INDEX "kanban_user_roles_user_id_idx" ON "kanban_user_roles" ("user_id");

