-- Add import metadata columns to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS import_source TEXT,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID,
  ADD COLUMN IF NOT EXISTS original_purchase_date TIMESTAMPTZ;

-- Create index for import_batch_id
CREATE INDEX IF NOT EXISTS products_import_batch_id_idx ON products(import_batch_id);

-- Create import_batches table
CREATE TABLE IF NOT EXISTS import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS import_batches_created_at_idx ON import_batches(created_at);

-- Create sku_aliases table
CREATE TABLE IF NOT EXISTS sku_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  legacy_sku TEXT UNIQUE,
  legacy_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sku_aliases_product_id_idx ON sku_aliases(product_id);


