DROP INDEX IF EXISTS "locations_area_name_idx";--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_area_name_unique" UNIQUE("area","name");