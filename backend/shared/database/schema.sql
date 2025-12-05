-- UAOL Database Schema
-- Supports PostgreSQL, CockroachDB, and PlanetScale

-- Note: UUID extension is not needed - we use gen_random_uuid() which is built-in
-- in both PostgreSQL 13+ and CockroachDB. For older PostgreSQL versions, you may
-- need to manually run: CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    current_credits BIGINT NOT NULL DEFAULT 0,
    subscription_tier TEXT NOT NULL DEFAULT 'Free' CHECK (subscription_tier IN ('Free', 'Pro', 'Enterprise')),
    api_key TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- MCP Tools table (Tool Registry)
CREATE TABLE IF NOT EXISTS mcp_tools (
    tool_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    gateway_url TEXT NOT NULL,
    credit_cost_per_call INTEGER NOT NULL DEFAULT 1,
    developer_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Disabled')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Processing Jobs table (Job Orchestration)
CREATE TABLE IF NOT EXISTS processing_jobs (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    workflow_definition JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'Queued' CHECK (status IN ('Queued', 'Running', 'Success', 'Failed', 'Retrying')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    final_output JSONB,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
CREATE INDEX IF NOT EXISTS idx_mcp_tools_developer ON mcp_tools(developer_id);
CREATE INDEX IF NOT EXISTS idx_mcp_tools_status ON mcp_tools(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_user ON processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_created ON processing_jobs(created_at);

-- Updated_at trigger function
-- CockroachDB requires dropping trigger before replacing function
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_mcp_tools_updated_at ON mcp_tools;
DROP TRIGGER IF EXISTS update_processing_jobs_updated_at ON processing_jobs;
DROP FUNCTION IF EXISTS update_updated_at_column();

CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at (DROP IF EXISTS to allow re-running migrations)
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mcp_tools_updated_at ON mcp_tools;
CREATE TRIGGER update_mcp_tools_updated_at BEFORE UPDATE ON mcp_tools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_processing_jobs_updated_at ON processing_jobs;
CREATE TRIGGER update_processing_jobs_updated_at BEFORE UPDATE ON processing_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

