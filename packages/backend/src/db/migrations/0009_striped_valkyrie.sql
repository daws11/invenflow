ALTER TABLE "products" ADD COLUMN "source_product_id" uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_source_product_id_idx" ON "products" ("source_product_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_source_product_id_products_id_fk" FOREIGN KEY ("source_product_id") REFERENCES "products"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
