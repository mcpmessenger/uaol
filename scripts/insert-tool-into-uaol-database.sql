-- Insert LangchainMCP tool into the 'uaol' database
-- IMPORTANT: Make sure you're connected to the 'uaol' database, not 'defaultdb'
-- Use the database dropdown in SQL Shell to select 'uaol', or run: USE uaol;

-- Step 1: Ensure user exists
INSERT INTO users (user_id, email, api_key, current_credits, subscription_tier)
VALUES (
    'fae97c83-cdbd-4b2c-a3c2-088e5d1f32cf'::uuid,
    'williamtflynn@gmail.com',
    'api-key-' || gen_random_uuid()::text,
    1000,
    'Free'
)
ON CONFLICT (user_id) DO NOTHING;

-- Step 2: Insert the tool (will update if it already exists)
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
    '940bb568-d19e-42fa-aa10-d880f5267e1c'::uuid,
    'Langchain Agent',
    'https://langchain-agent-mcp-server-554655392699.us-central1.run.app/mcp',
    5,
    'fae97c83-cdbd-4b2c-a3c2-088e5d1f32cf'::uuid,
    'rest',
    'Approved',
    NOW(),
    NOW()
)
ON CONFLICT (tool_id) DO UPDATE SET
    status = 'Approved',
    protocol = 'rest',
    updated_at = NOW()
RETURNING tool_id, name, protocol, status;

-- Step 3: Verify it was inserted
SELECT tool_id, name, protocol, status, gateway_url
FROM mcp_tools 
WHERE tool_id = '940bb568-d19e-42fa-aa10-d880f5267e1c'::uuid;
