-- Add protocol column to mcp_tools table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mcp_tools' AND column_name = 'protocol'
    ) THEN
        ALTER TABLE mcp_tools ADD COLUMN protocol TEXT NOT NULL DEFAULT 'json-rpc' CHECK (protocol IN ('json-rpc', 'rest'));
        RAISE NOTICE 'Protocol column added to mcp_tools table';
    ELSE
        RAISE NOTICE 'Protocol column already exists';
    END IF;
END $$;
