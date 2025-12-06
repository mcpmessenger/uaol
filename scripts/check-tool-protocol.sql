-- Check the specific tool's protocol value
-- Run this in CockroachDB SQL Shell

SELECT tool_id, name, protocol, status, gateway_url
FROM mcp_tools 
WHERE tool_id = '59540a12-6c11-4808-ac5a-9ec60ed9d012';

-- If the tool doesn't exist, check all tools
SELECT tool_id, name, protocol, status
FROM mcp_tools;
