-- Verify mcp_tools table structure
-- Run this in CockroachDB SQL Shell to check if protocol column exists

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'mcp_tools'
ORDER BY ordinal_position;

-- Check if the specific tool exists
SELECT tool_id, name, protocol, status
FROM mcp_tools 
WHERE tool_id = '59540a12-6c11-4808-ac5a-9ec60ed9d012';
