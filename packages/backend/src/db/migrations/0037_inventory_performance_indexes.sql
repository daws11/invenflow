-- Add composite indexes to improve inventory/kanban query performance
-- 1. Combined filters (kanban, column status, rejection flag) with partial index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_receive_inventory
  ON products (kanban_id, column_status, is_rejected)
  WHERE column_status IN ('Received', 'Stored');

-- 2. Category and supplier lookups for analytics and filters
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_supplier
  ON products (category, supplier)
  WHERE category IS NOT NULL;

-- 3. Ordering and filter paths for updated_at + status checks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_updated_status
  ON products (updated_at DESC, column_status, is_rejected);

-- 4. Case-insensitive SKU lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_sku_lower
  ON products (LOWER(sku));

