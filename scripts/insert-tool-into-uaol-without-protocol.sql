-- Insert LangchainMCP tool into the 'uaol' database
-- IMPORTANT: Run add-protocol-to-uaol-database.sql FIRST if you get "protocol column does not exist" error
-- Make sure you're connected to the 'uaol' database (not 'defaultdb')

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

-- Step 2: Insert the tool WITHOUT protocol column (if column doesn't exist yet)
-- If you get "protocol column does not exist", run add-protocol-to-uaol-database.sql first
INSERT INTO mcp_tools (
    tool_id,
    name,
    gateway_url,
    credit_cost_per_call,
    developer_id,
    status,
    created_at,
    updated_at
) VALUES (
    '940bb568-d19e-42fa-aa10-d880f5267e1c'::uuid,
    'Langchain Agent',
    'https://langchain-agent-mcp-server-554655392699.us-central1.run.app/mcp',
    5,
    'fae97c83-cdbd-4b2c-a3c2-088e5d1f32cf'::uuid,
    'Approved',
    NOW(),
    NOW()
)
ON CONFLICT (tool_id) DO UPDATE SET
    status = 'Approved',
    updated_at = NOW()
RETURNING tool_id, name, status;

-- Step 3: If protocol column exists, update it
-- Run this AFTER adding the protocol column:
UPDATE mcp_tools 
SET protocol = 'rest', updated_at = NOW()
WHERE tool_id = '940bb568-d19e-42fa-aa10-d880f5267e1c'::uuid;

-- Step 4: Verify it was inserted
SELECT tool_id, name, status, gateway_url
FROM mcp_tools 
WHERE tool_id = '940bb568-d19e-42fa-aa10-d880f5267e1c'::uuid;

