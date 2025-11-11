-- Performance optimization indexes for InvenFlow
-- Created for reducing API response times

-- Full-text search index for products
CREATE INDEX CONCURRENTLY IF NOT EXISTS "products_search_idx" 
ON "products" USING gin(to_tsvector('english', 
  COALESCE("product_details", '') || ' ' || 
  COALESCE("notes", '') || ' ' || 
  COALESCE("sku", '')
));

-- Composite index for inventory filtering (most common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "products_inventory_filter_idx" 
ON "products" ("column_status", "category", "supplier", "location_id", "updated_at" DESC);

-- Composite index for SKU-based operations (grouped inventory)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "products_sku_status_stock_idx" 
ON "products" ("sku", "column_status", "stock_level") 
WHERE "sku" IS NOT NULL;

-- Index for kanban-based filtering with status
CREATE INDEX CONCURRENTLY IF NOT EXISTS "products_kanban_status_updated_idx" 
ON "products" ("kanban_id", "column_status", "updated_at" DESC);

-- Index for location-based queries with status
CREATE INDEX CONCURRENTLY IF NOT EXISTS "products_location_status_idx" 
ON "products" ("location_id", "column_status") 
WHERE "location_id" IS NOT NULL;

-- Index for person assignment queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "products_person_status_idx" 
ON "products" ("assigned_to_person_id", "column_status") 
WHERE "assigned_to_person_id" IS NOT NULL;

-- Movement logs performance index
CREATE INDEX CONCURRENTLY IF NOT EXISTS "movement_logs_product_date_idx" 
ON "movement_logs" ("product_id", "created_at" DESC);

-- Movement logs location-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "movement_logs_location_date_idx" 
ON "movement_logs" ("to_location_id", "created_at" DESC) 
WHERE "to_location_id" IS NOT NULL;

-- Transfer logs performance index
CREATE INDEX CONCURRENTLY IF NOT EXISTS "transfer_logs_kanban_date_idx" 
ON "transfer_logs" ("to_kanban_id", "created_at" DESC);

-- Bulk movements performance index
CREATE INDEX CONCURRENTLY IF NOT EXISTS "bulk_movements_status_date_idx" 
ON "bulk_movements" ("status", "created_at" DESC);

-- Kanban links performance index
CREATE INDEX CONCURRENTLY IF NOT EXISTS "kanban_links_order_receive_idx" 
ON "kanban_links" ("order_kanban_id", "receive_kanban_id");

-- Persons department search optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS "persons_department_name_idx" 
ON "persons" ("department_id", "name") 
WHERE "is_active" = true;

-- Product validations performance index
CREATE INDEX CONCURRENTLY IF NOT EXISTS "product_validations_product_status_idx" 
ON "product_validations" ("product_id", "validation_status");
