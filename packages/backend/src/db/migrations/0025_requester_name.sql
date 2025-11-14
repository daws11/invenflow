-- Add requester_name column to products to store requester name separately from notes
ALTER TABLE products
ADD COLUMN IF NOT EXISTS requester_name text;


