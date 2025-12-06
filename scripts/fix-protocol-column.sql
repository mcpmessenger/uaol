-- Fix protocol column issue
-- Run these ONE AT A TIME in CockroachDB SQL Shell

-- Step 1: Check if protocol column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'mcp_tools' AND column_name = 'protocol';

-- Step 2: If the above returns no rows, add the column
ALTER TABLE mcp_tools 
ADD COLUMN IF NOT EXISTS protocol TEXT NOT NULL DEFAULT 'json-rpc';

-- Step 3: Add check constraint (may fail if already exists - that's OK)
ALTER TABLE mcp_tools 
ADD CONSTRAINT mcp_tools_protocol_check 
CHECK (protocol IN ('json-rpc', 'rest'));

-- Step 4: Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'mcp_tools' AND column_name = 'protocol';

-- Step 5: Update existing tools to have protocol = 'rest' if they don't have it set
UPDATE mcp_tools 
SET protocol = 'json-rpc' 
WHERE protocol IS NULL OR protocol = '';
