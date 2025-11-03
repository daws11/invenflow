CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");
--> statement-breakpoint
-- Insert default admin user
INSERT INTO "users" ("id", "email", "password_hash", "name", "role", "created_at", "updated_at")
VALUES (
	gen_random_uuid(),
	'admin@invenflow.com',
	'$2b$12$TjGeRSEVtUfkkNV0KqSiROMEnmvtma65/2T9LrD9kZtSqoLhSzfzS',
	'Default Admin',
	'admin',
	NOW(),
	NOW()
) ON CONFLICT ("email") DO NOTHING;