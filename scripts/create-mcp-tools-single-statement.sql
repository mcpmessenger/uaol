-- Run this as a SINGLE statement in CockroachDB SQL Shell
-- Copy everything below and paste it, then click Run

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    current_credits BIGINT NOT NULL DEFAULT 0,
    subscription_tier TEXT NOT NULL DEFAULT 'Free' CHECK (subscription_tier IN ('Free', 'Pro', 'Enterprise')),
    api_key TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS mcp_tools (
    tool_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    gateway_url TEXT NOT NULL,
    credit_cost_per_call INTEGER NOT NULL DEFAULT 1,
    developer_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    protocol TEXT NOT NULL DEFAULT 'json-rpc' CHECK (protocol IN ('json-rpc', 'rest')),
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Disabled')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
