-- Reset Locations and Products Database Script
-- This script will delete all data from locations and products tables
-- including stored logs and rejection logs
-- and reset their sequences

-- Begin transaction
BEGIN;

-- Delete tables that reference products and locations (in correct order)
DELETE FROM bulk_movement_items;
DELETE FROM bulk_movements;
DELETE FROM movement_logs;
DELETE FROM transfer_logs;
DELETE FROM stored_logs;
DELETE FROM product_validations;

-- Delete products
DELETE FROM products;

-- Delete locations
DELETE FROM locations;

-- Reset sequences (if using serial columns)
-- Note: Since using UUID with defaultRandom(), no sequence reset needed

-- Commit transaction
COMMIT;

-- Verify the reset
SELECT 'Products count: ' || COUNT(*) FROM products;
SELECT 'Locations count: ' || COUNT(*) FROM locations;
SELECT 'Stored logs count: ' || COUNT(*) FROM stored_logs;
SELECT 'Product validations count: ' || COUNT(*) FROM product_validations;