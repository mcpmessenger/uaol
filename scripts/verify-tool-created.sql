-- Verify the LangchainMCP tool was created successfully
-- Run this in CockroachDB SQL Shell

SELECT 
    tool_id,
    name,
    protocol,
    status,
    gateway_url,
    developer_id,
    created_at
FROM mcp_tools 
WHERE name = 'Langchain Agent'
ORDER BY created_at DESC;
