-- Cleanup script for duplicate "General" locations
-- This script must be run BEFORE applying the unique constraint migration
-- It will merge all duplicate General locations per area into a single location

BEGIN;

-- Step 1: Identify duplicate General locations per area
-- Create a temporary table to store the locations we want to keep (oldest per area)
CREATE TEMP TABLE locations_to_keep AS
SELECT DISTINCT ON (area, name)
    id,
    area,
    name
FROM locations
WHERE name = 'General'
ORDER BY area, name, created_at ASC; -- Keep the oldest one per area

-- Step 2: Display duplicates that will be merged (for logging)
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM locations l
    WHERE l.name = 'General'
    AND l.id NOT IN (SELECT id FROM locations_to_keep);
    
    RAISE NOTICE 'Found % duplicate General locations to merge', duplicate_count;
END $$;

-- Step 3: Update all products pointing to duplicate locations
-- Point them to the location we're keeping for that area
UPDATE products p
SET 
    location_id = ltk.id,
    updated_at = NOW()
FROM locations l
JOIN locations_to_keep ltk ON l.area = ltk.area AND l.name = ltk.name
WHERE 
    p.location_id = l.id
    AND l.id != ltk.id
    AND l.name = 'General';

-- Step 4: Update bulk_movements table (from_location_id)
UPDATE bulk_movements bm
SET 
    from_location_id = ltk.id,
    updated_at = NOW()
FROM locations l
JOIN locations_to_keep ltk ON l.area = ltk.area AND l.name = ltk.name
WHERE 
    bm.from_location_id = l.id
    AND l.id != ltk.id
    AND l.name = 'General';

-- Step 5: Update bulk_movements table (to_location_id)
UPDATE bulk_movements bm
SET 
    to_location_id = ltk.id,
    updated_at = NOW()
FROM locations l
JOIN locations_to_keep ltk ON l.area = ltk.area AND l.name = ltk.name
WHERE 
    bm.to_location_id = l.id
    AND l.id != ltk.id
    AND l.name = 'General';

-- Step 6: Update movement_logs table (from_location_id)
UPDATE movement_logs ml
SET from_location_id = ltk.id
FROM locations l
JOIN locations_to_keep ltk ON l.area = ltk.area AND l.name = ltk.name
WHERE 
    ml.from_location_id = l.id
    AND l.id != ltk.id
    AND l.name = 'General';

-- Step 7: Update movement_logs table (to_location_id)
UPDATE movement_logs ml
SET to_location_id = ltk.id
FROM locations l
JOIN locations_to_keep ltk ON l.area = ltk.area AND l.name = ltk.name
WHERE 
    ml.to_location_id = l.id
    AND l.id != ltk.id
    AND l.name = 'General';

-- Step 8: Delete duplicate General locations
DELETE FROM locations l
WHERE 
    l.name = 'General'
    AND l.id NOT IN (SELECT id FROM locations_to_keep);

-- Step 9: Verify cleanup
DO $$
DECLARE
    remaining_duplicates INTEGER;
BEGIN
    SELECT COUNT(*) - COUNT(DISTINCT area) INTO remaining_duplicates
    FROM locations
    WHERE name = 'General';
    
    IF remaining_duplicates > 0 THEN
        RAISE EXCEPTION 'Cleanup failed: % duplicate General locations still exist', remaining_duplicates;
    ELSE
        RAISE NOTICE 'Cleanup successful: All duplicate General locations have been merged';
    END IF;
END $$;

-- Display final state
SELECT 
    area,
    name,
    code,
    COUNT(*) as count
FROM locations
WHERE name = 'General'
GROUP BY area, name, code
ORDER BY area;

COMMIT;

-- If you want to rollback instead of commit, use:
-- ROLLBACK;

