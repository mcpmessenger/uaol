# Resolving the Tool ID Requirement: Complete Solution Guide

This document provides a **step-by-step solution** for resolving the "Tool not found" issue when integrating LangchainMCP with UAOL. It addresses both the tool registration process and the database connectivity issues that prevent tools from being found.

## 🎯 Problem Statement

When attempting to use a tool that has been registered in the database, the Tool Proxy Service returns:
```json
{"success":false,"error":{"code":"NOT_FOUND","message":"Tool not found"}}
```

Even though:
- ✅ The tool exists in the database (verified via SQL)
- ✅ The tool has `status = 'Approved'`
- ✅ All services are running and healthy

## 🔍 Root Cause Analysis

The issue stems from one or more of these problems:

1. **Database Connection Mismatch** - Service connects to different database than where tool was inserted
2. **Connection Pool Staleness** - Pool initialized before tool was inserted
3. **UUID Type Mismatch** - Query doesn't match UUID format in database
4. **Environment Variable Not Loaded** - Service doesn't have correct `DATABASE_URL`

## ✅ Complete Solution Steps

### Step 1: Verify Database Connection

**First, ensure you know which database you're connecting to:**

```bash
# Check DATABASE_URL in backend/.env
cat backend/.env | grep DATABASE_URL

# Or on Windows PowerShell
Get-Content backend\.env | Select-String DATABASE_URL
```

**Save this URL** - you'll need it to verify the tool was inserted in the same database.

### Step 2: Insert Tool into Database

**Option A: Direct SQL Insert (Recommended for Testing)**

1. Connect to your CockroachDB database using the `DATABASE_URL` from Step 1
2. Run this SQL (replace values as needed):

```sql
-- First, ensure the user exists
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
    '940bb568-d19e-42fa-aa10-d880f5267e1c'::uuid,  -- Use ::uuid cast
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
```

**Important:** Note the `::uuid` casts - this ensures proper UUID type handling in CockroachDB.

**Option B: Use Test Script**

```bash
# Run the test script to verify tool exists
node scripts/test-tool-query-simple.js
```

This will:
- Connect using `DATABASE_URL` from `backend/.env`
- Query for the tool
- List all tools if the specific one isn't found
- Show connection details

### Step 3: Verify Tool Exists in Database

**Run this query in your database:**

```sql
SELECT 
    tool_id,
    name,
    protocol,
    status,
    gateway_url,
    developer_id
FROM mcp_tools 
WHERE tool_id = '940bb568-d19e-42fa-aa10-d880f5267e1c'::uuid;
```

**Expected:** Should return 1 row with the tool details.

**If no results:**
- Tool wasn't inserted correctly
- You're querying a different database
- Check for typos in the tool_id

### Step 4: Verify Service Database Connection

**The service must connect to the SAME database where you inserted the tool.**

1. **Check service logs on startup:**
   ```bash
   # Look for these messages when starting services
   [Tool-Proxy] DATABASE_URL: ✓ SET
   [DB Connection] Creating pool with connection string: ...
   ```

2. **Compare connection strings:**
   - Database URL from Step 1 (where tool was inserted)
   - Database URL in service logs (where service connects)
   - **They must match exactly** (same host, database, credentials)

3. **If they don't match:**
   - Service is using wrong `DATABASE_URL`
   - Check `backend/.env` file
   - Verify `.env` is loaded before services start
   - Restart services after fixing `.env`

### Step 5: Fix UUID Query Issue

**The query might fail due to UUID type mismatch. Update the model:**

Edit `backend/shared/database/models/mcp-tool.ts`:

```typescript
async findById(toolId: string): Promise<MCPTool | null> {
  // Use explicit UUID casting for CockroachDB
  const query = 'SELECT * FROM mcp_tools WHERE tool_id::uuid = $1::uuid';
  
  console.log('[MCPToolModel.findById] Looking for tool:', toolId);
  
  try {
    const result = await this.pool.query(query, [toolId]);
    
    if (result.rows.length === 0) {
      console.log('[MCPToolModel.findById] No tool found');
      return null;
    }
    
    return this.mapRowToTool(result.rows[0]);
  } catch (error: any) {
    console.error('[MCPToolModel.findById] Error:', error.message);
    throw error;
  }
}
```

**Key change:** `WHERE tool_id::uuid = $1::uuid` ensures proper UUID comparison.

### Step 6: Rebuild and Restart Services

**After making code changes:**

```bash
cd backend

# Rebuild shared package (if you modified mcp-tool.ts)
cd shared
npm run build
cd ..

# Restart all services
npm run dev

# Or use the startup script
cd ..
.\scripts\start-all-services.ps1  # Windows
# or
bash scripts/start-all-services.sh  # Linux/Mac
```

**Wait 10-15 seconds** for services to fully start.

### Step 7: Test Tool Lookup

**Verify the service can now find the tool:**

```bash
# Test 1: Service health
curl http://localhost:3004/health

# Test 2: Tool lookup (should now work)
curl http://localhost:3004/proxy/940bb568-d19e-42fa-aa10-d880f5267e1c/tools
```

**Expected Result:**
```json
{
  "success": true,
  "data": [
    {
      "name": "...",
      "description": "...",
      "inputSchema": {...}
    }
  ]
}
```

**If still getting "Tool not found":**

1. **Check service logs** for `[MCPToolModel.findById]` messages
2. **Verify database connection** - run `scripts/test-tool-query-simple.js` again
3. **Compare tool_id** - ensure no typos or extra spaces
4. **Check service is using correct DATABASE_URL** - look at startup logs

## 🔧 Advanced Troubleshooting

### Issue: Service connects to wrong database

**Symptoms:**
- Tool exists in database A
- Service connects to database B
- Service can't find tool

**Solution:**
1. Verify `DATABASE_URL` in `backend/.env` matches database where tool was inserted
2. Check for multiple `.env` files (root vs backend directory)
3. Ensure `.env` is loaded before database connection is created
4. Restart services after fixing `.env`

### Issue: UUID type mismatch

**Symptoms:**
- Tool exists but query returns no results
- Database shows tool with UUID type
- Query uses string comparison

**Solution:**
- Use explicit UUID casting: `WHERE tool_id::uuid = $1::uuid`
- Ensure tool_id is inserted as UUID: `'...'::uuid`
- Check CockroachDB UUID handling in queries

### Issue: Connection pool stale

**Symptoms:**
- Tool inserted after service started
- Service can't find newly inserted tool
- Restart fixes it temporarily

**Solution:**
1. Always restart services after inserting tools
2. Or implement connection pool refresh mechanism
3. Consider using connection pool with shorter idle timeout

### Issue: Environment variable not loaded

**Symptoms:**
- Service uses default/localhost database
- `DATABASE_URL` not found in logs
- Service can't connect to correct database

**Solution:**
1. Verify `.env` file exists in `backend/` directory
2. Check `.env` file has `DATABASE_URL=...` (no spaces around `=`)
3. Ensure services load `.env` before creating database connection
4. Check service startup code loads `dotenv` first

## 📋 Verification Checklist

Before considering the issue resolved:

- [ ] Tool exists in database (verified via SQL query)
- [ ] Tool has `status = 'Approved'`
- [ ] Tool has correct `protocol = 'rest'`
- [ ] `DATABASE_URL` in `backend/.env` matches database where tool was inserted
- [ ] Service logs show correct `DATABASE_URL` on startup
- [ ] Service can query database (other queries work)
- [ ] UUID casting is used in `findById` query
- [ ] Services restarted after code changes
- [ ] `curl` to `/proxy/{toolId}/tools` returns tool methods (not "Tool not found")
- [ ] Service logs show `[MCPToolModel.findById] Tool found` message

## 🚀 Quick Fix Summary

**If you just want to get it working quickly:**

1. **Insert tool with UUID cast:**
   ```sql
   INSERT INTO mcp_tools (..., tool_id, ...) 
   VALUES (..., '940bb568-d19e-42fa-aa10-d880f5267e1c'::uuid, ...);
   ```

2. **Update query to use UUID cast:**
   ```typescript
   const query = 'SELECT * FROM mcp_tools WHERE tool_id::uuid = $1::uuid';
   ```

3. **Rebuild and restart:**
   ```bash
   cd backend/shared && npm run build && cd ../..
   npm run dev
   ```

4. **Test:**
   ```bash
   curl http://localhost:3004/proxy/940bb568-d19e-42fa-aa10-d880f5267e1c/tools
   ```

## 📚 Related Documentation

- **Bug Bounty:** `doc/BUG_BOUNTY_TOOL_NOT_FOUND.md` - Detailed bug report
- **Service Startup:** `scripts/README-START-SERVICES.md` - Starting services guide
- **Test Scripts:** `scripts/test-tool-query-simple.js` - Database connectivity test

## 🎯 Success Criteria

The issue is resolved when:
- ✅ Tool Proxy Service can find tools that exist in database
- ✅ `/proxy/{toolId}/tools` endpoint returns tool methods
- ✅ No "Tool not found" errors
- ✅ Works consistently after service restarts

---

**Last Updated:** 2025-12-06  
**Status:** Solution Guide - Actionable Steps
