# Database Name Mismatch: defaultdb vs uaol

## 🔴 The Problem

**The tool exists in:** `defaultdb` database  
**The service connects to:** `uaol` database

These are **different databases** in the same cluster!

## ✅ Solution Options

### Option 1: Insert Tool into `uaol` Database (Recommended)

The service uses `/uaol` in the connection string. Insert the tool there:

1. **In CockroachDB SQL Shell, switch to `uaol` database:**
   ```sql
   USE uaol;
   ```

2. **Or use the database dropdown** in SQL Shell to select `uaol`

3. **Then insert the tool:**
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

### Option 2: Change Service to Use `defaultdb`

Update `backend/.env` to use `defaultdb` instead of `uaol`:

```bash
# Change from:
DATABASE_URL=postgresql://.../uaol?sslmode=...

# To:
DATABASE_URL=postgresql://.../defaultdb?sslmode=...
```

Then restart services.

## 🎯 Recommended: Option 1

**Insert the tool into the `uaol` database** because:
- ✅ Service is already configured for `uaol`
- ✅ No need to change configuration
- ✅ Just one SQL insert

## 📋 Quick Steps

1. **In CockroachDB SQL Shell, select `uaol` database** (use dropdown or `USE uaol;`)
2. **Run the insert SQL** (from Option 1 above)
3. **Verify:**
   ```sql
   SELECT tool_id, name, protocol, status 
   FROM mcp_tools 
   WHERE tool_id = '940bb568-d19e-42fa-aa10-d880f5267e1c'::uuid;
   ```
4. **Test service:**
   ```bash
   curl http://localhost:3004/proxy/940bb568-d19e-42fa-aa10-d880f5267e1c/tools
   ```

---

**Status:** 🔍 Database name mismatch - tool in `defaultdb`, service uses `uaol`
