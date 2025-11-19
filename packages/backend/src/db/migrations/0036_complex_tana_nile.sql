CREATE TABLE IF NOT EXISTS "product_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_comments_product_id_idx" ON "product_comments" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_comments_user_id_idx" ON "product_comments" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_comments_created_at_idx" ON "product_comments" ("created_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_comments" ADD CONSTRAINT "product_comments_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_comments" ADD CONSTRAINT "product_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
