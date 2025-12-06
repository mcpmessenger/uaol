-- Create user and insert tool in one go
-- Run these ONE AT A TIME in CockroachDB SQL Shell

-- Step 1: Create a user (using your OAuth email)
INSERT INTO users (user_id, email, api_key, current_credits, subscription_tier)
VALUES (
    'fae97c83-cdbd-4b2c-a3c2-088e5d1f32cf'::uuid,
    'williamtflynn@gmail.com',
    'api-key-' || gen_random_uuid()::text,
    1000,
    'Free'
)
ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email
ON CONFLICT (email) DO NOTHING
RETURNING user_id, email;

-- Step 2: Verify user was created
SELECT user_id, email, subscription_tier FROM users WHERE user_id = 'fae97c83-cdbd-4b2c-a3c2-088e5d1f32cf';

-- Step 3: Insert the LangchainMCP tool
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
    'fae97c83-cdbd-4b2c-a3c2-088e5d1f32cf'::uuid,
    'rest',
    'Approved',
    NOW(),
    NOW()
)
RETURNING tool_id, name, protocol, status;

-- Step 4: Verify the tool was created
SELECT tool_id, name, protocol, status, developer_id 
FROM mcp_tools 
WHERE name = 'Langchain Agent';
