-- Migration: Add protocol column to mcp_tools table
-- This migration is safe to run multiple times (idempotent)
-- CockroachDB compatible: uses ADD COLUMN IF NOT EXISTS

-- Add protocol column if it doesn't exist
ALTER TABLE mcp_tools ADD COLUMN IF NOT EXISTS protocol TEXT NOT NULL DEFAULT 'json-rpc';

-- Add check constraint (will fail gracefully if it already exists)
-- Note: CockroachDB doesn't support IF NOT EXISTS for constraints
-- The migrate.ts script will catch and ignore the error if constraint already exists
ALTER TABLE mcp_tools ADD CONSTRAINT mcp_tools_protocol_check 
  CHECK (protocol IN ('json-rpc', 'rest'));
