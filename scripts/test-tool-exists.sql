-- Verify the tool exists with the exact tool_id
-- Run this in CockroachDB SQL Shell

SELECT 
    tool_id,
    name,
    protocol,
    status,
    gateway_url,
    developer_id
FROM mcp_tools 
WHERE tool_id = '940bb568-d19e-42fa-aa10-d880f5267e1c';

-- Also check if there are any other tools
SELECT COUNT(*) as total_tools FROM mcp_tools;
