# Database Mismatch Solution

## 🔴 Problem

The UUID casting fix is **active** (query shows `WHERE tool_id::uuid = $1::uuid`), but the tool still isn't found (`rowCount: 0`).

This means: **The tool exists in one database, but the service connects to a different database.**

## ✅ Solution

### Step 1: Verify Which Database Service Connects To

The service uses `DATABASE_URL` from `backend/.env`. Check it:

```bash
# Windows PowerShell
Get-Content backend\.env | Select-String DATABASE_URL

# Or view the connection string in service logs
# Look for: [DB Connection] DATABASE_URL value: postgresql://...
```

### Step 2: Verify Tool Exists in That Database

Run the verification script:

```bash
node scripts/verify-database-match.js
```

This will:
- Connect using the same `DATABASE_URL` from `backend/.env`
- Query for the tool using UUID casting (same as service)
- Show if the tool exists in that database

### Step 3: Insert Tool into Correct Database

If the tool doesn't exist, insert it into the database the service connects to:

```sql
-- Connect to the database using DATABASE_URL from backend/.env
-- Then run:

-- First ensure user exists
INSERT INTO users (user_id, email, api_key, current_credits, subscription_tier)
VALUES (
    'fae97c83-cdbd-4b2c-a3c2-088e5d1f32cf'::uuid,
    'williamtflynn@gmail.com',
    'api-key-' || gen_random_uuid()::text,
    1000,
    'Free'
)
ON CONFLICT (user_id) DO NOTHING;

-- Then insert the tool
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

### Step 4: Verify After Insert

```bash
# Run verification again
node scripts/verify-database-match.js

# Should now show: ✅ Tool found in database!
```

### Step 5: Test Service

```bash
curl http://localhost:3004/proxy/940bb568-d19e-42fa-aa10-d880f5267e1c/tools
```

**Expected:** Should now return tool methods (not "Tool not found")

## 🔍 How to Identify Database Mismatch

### Signs:
- ✅ UUID casting fix is active (query shows `::uuid`)
- ❌ `rowCount: 0` in service logs
- ✅ Tool exists when you query directly (but maybe different database)

### Check:
1. **Service DATABASE_URL** - From service logs: `[DB Connection] DATABASE_URL value: ...`
2. **Your DATABASE_URL** - From `backend/.env`
3. **Tool location** - Which database did you insert it into?

They must match!

## 📋 Quick Fix

If you know the tool is in a different database:

1. **Get the DATABASE_URL from service logs** (the one it's actually using)
2. **Connect to that database**
3. **Insert the tool there**

Or:

1. **Update `backend/.env`** to point to the database where the tool exists
2. **Restart services**

---

**Status:** 🔍 Database mismatch - tool in different database than service connects to
