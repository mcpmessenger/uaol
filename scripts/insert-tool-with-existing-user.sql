-- Insert LangchainMCP tool using an existing user
-- Run these ONE AT A TIME in CockroachDB SQL Shell

-- Step 1: Find an existing user
SELECT user_id, email FROM users LIMIT 1;

-- Step 2: Insert the tool using that user_id
-- Replace 'USER_ID_HERE' with the user_id from Step 1
INSERT INTO mcp_tools (
    tool_id,
    name,
    gateway_url,
    credit_cost_per_call,
    developer_id,
    protocol,
    status,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Langchain Agent',
    'https://langchain-agent-mcp-server-554655392699.us-central1.run.app/mcp',
    5,
    (SELECT user_id FROM users LIMIT 1),  -- Use first available user
    'rest',
    'Approved',
    NOW(),
    NOW()
)
RETURNING tool_id, name, protocol, status, developer_id;

-- Step 3: Verify the tool was created
SELECT tool_id, name, protocol, status, developer_id 
FROM mcp_tools 
WHERE name = 'Langchain Agent';
