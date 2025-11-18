ALTER TABLE "movement_logs"
ADD COLUMN IF NOT EXISTS "from_area" text,
ADD COLUMN IF NOT EXISTS "to_area" text;

CREATE INDEX IF NOT EXISTS "movement_logs_from_area_idx"
  ON "movement_logs" ("from_area");

CREATE INDEX IF NOT EXISTS "movement_logs_to_area_idx"
  ON "movement_logs" ("to_area");


