-- Insert LangchainMCP tool directly into database
-- This bypasses the API registration that keeps timing out

-- Your user ID from JWT token: fae97c83-cdbd-4b2c-a3c2-088e5d1f32cf
-- Run this in CockroachDB SQL Shell

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

-- After running, save the tool_id that's returned
-- Then verify it exists:
-- SELECT tool_id, name, protocol, status FROM mcp_tools WHERE name = 'Langchain Agent';
