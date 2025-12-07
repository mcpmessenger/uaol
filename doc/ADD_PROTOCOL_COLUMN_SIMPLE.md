# Add Protocol Column - Simple Version

## 🔴 The Problem

CockroachDB doesn't support the `DO $$` block syntax for adding constraints. Use this simpler approach:

## ✅ Simple Solution

### Step 1: Add Protocol Column

In CockroachDB SQL Shell (make sure you're in `uaol` database), run:

```sql
ALTER TABLE mcp_tools 
ADD COLUMN IF NOT EXISTS protocol VARCHAR(20) DEFAULT 'json-rpc';
```

### Step 2: Verify Column Was Added

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'mcp_tools' 
AND column_name = 'protocol';
```

Should return 1 row.

### Step 3: Insert the Tool

Now you can insert the tool with the protocol:

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

-- Insert the tool
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

1. **Make sure you're in `uaol` database**
2. **Add column:** `ALTER TABLE mcp_tools ADD COLUMN IF NOT EXISTS protocol VARCHAR(20) DEFAULT 'json-rpc';`
3. **Verify:** Check the column exists
4. **Insert tool:** Run the insert SQL above
5. **Test:** `curl http://localhost:3004/proxy/940bb568-d19e-42fa-aa10-d880f5267e1c/tools`

---

**Status:** ✅ Simple solution - just add the column, skip the constraint



