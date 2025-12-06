-- Direct SQL to add protocol column to mcp_tools table
-- Run this directly against your CockroachDB database

-- Add the column (CockroachDB supports IF NOT EXISTS)
ALTER TABLE mcp_tools 
ADD COLUMN IF NOT EXISTS protocol TEXT NOT NULL DEFAULT 'json-rpc';

-- Add check constraint
-- Note: CockroachDB may not support IF NOT EXISTS for constraints
-- If this fails with "already exists", that's OK - the constraint is already there
ALTER TABLE mcp_tools 
ADD CONSTRAINT mcp_tools_protocol_check 
CHECK (protocol IN ('json-rpc', 'rest'));

-- Verify the column was added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'mcp_tools' AND column_name = 'protocol';
