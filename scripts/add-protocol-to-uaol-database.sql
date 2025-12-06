-- Add protocol column to mcp_tools table in uaol database
-- IMPORTANT: Make sure you're connected to the 'uaol' database
-- Use the database dropdown in SQL Shell to select 'uaol', or run: USE uaol;

-- Step 1: Add protocol column if it doesn't exist
ALTER TABLE mcp_tools 
ADD COLUMN IF NOT EXISTS protocol VARCHAR(20) DEFAULT 'json-rpc';

-- Step 2: Add check constraint if it doesn't exist
-- Note: CockroachDB doesn't support IF NOT EXISTS for constraints, so this may error if it exists
-- That's okay - just ignore the error
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'mcp_tools_protocol_check' 
        AND table_name = 'mcp_tools'
    ) THEN
        ALTER TABLE mcp_tools 
        ADD CONSTRAINT mcp_tools_protocol_check 
        CHECK (protocol IN ('json-rpc', 'rest'));
    END IF;
END $$;

-- Step 3: Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'mcp_tools' 
AND column_name = 'protocol';

-- Expected: Should show protocol column with VARCHAR(20) type

