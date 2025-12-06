-- Add protocol column to mcp_tools table in uaol database
-- IMPORTANT: Make sure you're connected to the 'uaol' database
-- Use the database dropdown in SQL Shell to select 'uaol', or run: USE uaol;

-- Step 1: Add protocol column (CockroachDB supports IF NOT EXISTS)
ALTER TABLE mcp_tools 
ADD COLUMN IF NOT EXISTS protocol VARCHAR(20) DEFAULT 'json-rpc';

-- Step 2: Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'mcp_tools' 
AND column_name = 'protocol';

-- Expected: Should show protocol column with VARCHAR(20) type

-- Note: We're skipping the constraint for now - it's not critical
-- The column will default to 'json-rpc' and you can update it to 'rest' when inserting

