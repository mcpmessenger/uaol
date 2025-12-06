-- Check all tools in the database
-- Run this in CockroachDB SQL Shell

SELECT tool_id, name, protocol, status, gateway_url, created_at
FROM mcp_tools
ORDER BY created_at DESC;
