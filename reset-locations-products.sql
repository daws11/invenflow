-- Reset Locations and Products Database Script
-- This script will delete all data from locations and products tables
-- and reset their sequences

-- Begin transaction
BEGIN;

-- Delete tables that reference products and locations (in correct order)
DELETE FROM bulk_movement_items;
DELETE FROM bulk_movements;
DELETE FROM movement_logs;
DELETE FROM transfer_logs;

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