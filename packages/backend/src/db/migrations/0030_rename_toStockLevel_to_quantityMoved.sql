-- Migration: Rename toStockLevel to quantityMoved in movement_logs table
-- This makes the column name accurately reflect what it stores: the quantity moved, not the final stock level

ALTER TABLE movement_logs 
RENAME COLUMN to_stock_level TO quantity_moved;

-- Add comment to clarify the column's purpose
COMMENT ON COLUMN movement_logs.quantity_moved IS 'The quantity of product moved in this transaction (not the final stock level at destination)';
COMMENT ON COLUMN movement_logs.from_stock_level IS 'The stock level at source location before the movement';

