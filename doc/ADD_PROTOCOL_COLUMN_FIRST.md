# Add Protocol Column to uaol Database First

## 🔴 The Problem

You're getting this error:
```
ERROR: column "protocol" does not exist
```

This means the `mcp_tools` table in the `uaol` database doesn't have the `protocol` column yet.

## ✅ Solution: Add Column First

### Step 1: Add Protocol Column

In CockroachDB SQL Shell (make sure you're in `uaol` database), run:

```sql
-- Add protocol column
ALTER TABLE mcp_tools 
ADD COLUMN IF NOT EXISTS protocol VARCHAR(20) DEFAULT 'json-rpc';

-- Add check constraint (may error if exists - that's okay)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'mcp_tools_protocol_check' 
        AND table_name = 'mcp_tools'
    ) THEN
        ALTER TABLE mcp_tools 
        ADD CONSTRAINT mcp_tools_protocol_check 
        CHECK (protocol IN ('json-rpc', 'rest'));
    END IF;
END $$;
```

### Step 2: Verify Column Was Added

```sql
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'mcp_tools' 
AND column_name = 'protocol';
```

Should return 1 row showing the `protocol` column.

### Step 3: Now Insert the Tool

After the column is added, run your insert SQL again (the one with `protocol` in it).

Or use this complete script:

```sql
-- Ensure user exists
INSERT INTO users (user_id, email, api_key, current_credits, subscription_tier)
VALUES (
    'fae97c83-cdbd-4b2c-a3c2-088e5d1f32cf'::uuid,
    'williamtflynn@gmail.com',
    'api-key-' || gen_random_uuid()::text,
    1000,
    'Free'
)
ON CONFLICT (user_id) DO NOTHING;

-- Insert the tool (now with protocol column)
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
```

## 📋 Quick Steps

1. **Make sure you're in `uaol` database** (dropdown or `USE uaol;`)
2. **Add protocol column** (run Step 1 SQL above)
3. **Verify column exists** (run Step 2 SQL)
4. **Insert the tool** (run Step 3 SQL)
5. **Test service:**
   ```bash
   curl http://localhost:3004/proxy/940bb568-d19e-42fa-aa10-d880f5267e1c/tools
   ```

---

**Status:** 🔧 Need to add `protocol` column to `uaol` database first



