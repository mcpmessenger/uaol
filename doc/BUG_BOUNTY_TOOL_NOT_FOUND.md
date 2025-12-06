# 🐛 Bug Bounty: Tool Proxy Service Returns "Tool not found" Despite Tool Existing in Database

## 🎯 Bug Summary

**Severity:** High  
**Component:** Tool Proxy Service (`backend/services/tool-proxy-service`)  
**Status:** 🔴 Open - Under Investigation  
**Bounty:** TBD

The Tool Proxy Service consistently returns `{"success":false,"error":{"code":"NOT_FOUND","message":"Tool not found"}}` when querying for tools that exist in the database and are verified via direct SQL queries.

## 📋 Problem Description

### Expected Behavior
When calling `GET /proxy/{toolId}/tools`, the service should:
1. Query the database for the tool with the given `tool_id`
2. Verify the tool exists and has status `Approved`
3. Return the tool's methods from the external MCP server

### Actual Behavior
The service returns:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Tool not found"
  }
}
```

Even when:
- ✅ The tool exists in the database (verified via direct SQL)
- ✅ The tool has `status = 'Approved'`
- ✅ The tool has correct `protocol = 'rest'`
- ✅ All backend services report as healthy
- ✅ Database connection is working (other queries succeed)

## 🔍 Steps to Reproduce

1. **Insert tool directly into database:**
   ```sql
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
       '940bb568-d19e-42fa-aa10-d880f5267e1c',
       'Langchain Agent',
       'https://langchain-agent-mcp-server-554655392699.us-central1.run.app/mcp',
       5,
       'fae97c83-cdbd-4b2c-a3c2-088e5d1f32cf'::uuid,
       'rest',
       'Approved',
       NOW(),
       NOW()
   );
   ```

2. **Verify tool exists:**
   ```sql
   SELECT tool_id, name, protocol, status 
   FROM mcp_tools 
   WHERE tool_id = '940bb568-d19e-42fa-aa10-d880f5267e1c';
   ```
   ✅ Returns 1 row

3. **Start all backend services:**
   ```bash
   cd backend
   npm run dev
   ```

4. **Wait for services to start** (10-15 seconds)

5. **Verify services are healthy:**
   ```bash
   curl http://localhost:3000/health  # API Gateway
   curl http://localhost:3002/health  # Tool Registry
   curl http://localhost:3004/health   # Tool Proxy
   ```
   ✅ All return `{"status":"healthy"}`

6. **Attempt to fetch tool methods:**
   ```bash
   curl http://localhost:3004/proxy/940bb568-d19e-42fa-aa10-d880f5267e1c/tools
   ```

7. **Observe error:**
   ```json
   {"success":false,"error":{"code":"NOT_FOUND","message":"Tool not found"}}
   ```

## 🔬 Technical Analysis

### Code Flow

1. **Request arrives at:** `backend/services/tool-proxy-service/src/routes/proxy.ts`
   - Route: `GET /proxy/:toolId/tools`
   - Handler: `proxyController.listToolMethods`

2. **Controller logic:** `backend/services/tool-proxy-service/src/controllers/proxy-controller.ts`
   ```typescript
   async listToolMethods(req: Request, res: Response, next: NextFunction) {
     const { toolId } = req.params;
     const tool = await toolModel.findById(toolId);
     if (!tool || tool.status !== 'Approved') {
       throw new NotFoundError('Tool');
     }
     // ... rest of logic
   }
   ```

3. **Database query:** `backend/shared/database/models/mcp-tool.ts`
   ```typescript
   async findById(toolId: string): Promise<MCPTool | null> {
     const query = 'SELECT * FROM mcp_tools WHERE tool_id = $1';
     const result = await this.pool.query(query, [toolId]);
     if (result.rows.length === 0) {
       return null;
     }
     return this.mapRowToTool(result.rows[0]);
   }
   ```

### Database Connection

The service uses `getDatabasePool()` from `backend/shared/database/connection.ts`:
- Connection string comes from `process.env.DATABASE_URL`
- Pool is created on first access
- Connection pooling is enabled (min: 2, max: 10)

### Potential Root Causes

#### 1. **Database Connection Pool Staleness** ⚠️ Most Likely
- **Hypothesis:** The connection pool was initialized before the tool was inserted
- **Evidence:** Tool exists in database but service can't find it
- **Test:** Restart service after tool insertion → Still fails
- **Status:** ❌ Not resolved by restart

#### 2. **Different Database Instance**
- **Hypothesis:** Service connects to different database than where tool was inserted
- **Evidence:** Multiple database URLs in config vs `.env`
- **Test:** Verify `DATABASE_URL` in service matches database used for insertion
- **Status:** 🔍 Needs verification

#### 3. **UUID Type Mismatch**
- **Hypothesis:** `tool_id` stored as UUID but queried as string (or vice versa)
- **Evidence:** CockroachDB UUID handling differences
- **Test:** Query with explicit UUID cast: `WHERE tool_id::uuid = $1::uuid`
- **Status:** 🔍 Needs testing

#### 4. **Transaction Isolation**
- **Hypothesis:** Tool inserted in uncommitted transaction
- **Evidence:** Unlikely (direct SQL insert should auto-commit)
- **Test:** Verify with `SELECT` immediately after `INSERT`
- **Status:** ✅ Verified - tool exists

#### 5. **Schema/Table Mismatch**
- **Hypothesis:** Service queries wrong table or schema
- **Evidence:** Service uses `mcp_tools` table (correct)
- **Test:** Verify table name in query matches actual table
- **Status:** ✅ Verified - table name correct

#### 6. **Connection String Priority**
- **Hypothesis:** Service uses config database URL instead of `.env` `DATABASE_URL`
- **Evidence:** Complex connection logic in `connection.ts` with fallbacks
- **Test:** Add logging to show which connection string is used
- **Status:** 🔍 Needs verification

## 🛠️ Investigation Steps Taken

### ✅ Completed
1. Verified tool exists in database via direct SQL
2. Confirmed all services are running and healthy
3. Added detailed logging to `MCPToolModel.findById()`
4. Verified table structure and column names
5. Tested with multiple tool IDs
6. Restarted services multiple times
7. Verified database connection is working (other queries succeed)

### 🔄 In Progress
1. Adding connection string logging to identify which database is used
2. Testing UUID type casting in queries
3. Verifying `.env` file is loaded correctly by service
4. Checking for connection pool caching issues

### 📝 Pending
1. Compare `DATABASE_URL` used by service vs. database where tool was inserted
2. Test with explicit UUID casting in query
3. Add connection pool reset mechanism
4. Verify service logs show database queries

## 💡 Proposed Solutions

### Solution 1: Force Connection Pool Refresh
**Priority:** High  
**Effort:** Low

Add a mechanism to refresh the connection pool when tools are inserted:
```typescript
// In connection.ts
export async function refreshConnectionPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    poolConnectionString = null;
  }
}
```

**Pros:**
- Simple to implement
- Forces fresh connection

**Cons:**
- Doesn't address root cause
- May cause connection churn

### Solution 2: Verify Database Connection String
**Priority:** Critical  
**Effort:** Low

Add logging to show exactly which database URL is being used:
```typescript
// In connection.ts - getDatabasePool()
console.log('[DB Connection] Using DATABASE_URL:', maskedUrl);
console.log('[DB Connection] Pool connection string:', poolConnectionString);
```

**Pros:**
- Identifies root cause
- Low overhead

**Cons:**
- Only diagnostic, not a fix

### Solution 3: Explicit UUID Casting
**Priority:** Medium  
**Effort:** Low

Modify query to explicitly cast UUID:
```typescript
async findById(toolId: string): Promise<MCPTool | null> {
  const query = 'SELECT * FROM mcp_tools WHERE tool_id::uuid = $1::uuid';
  // ...
}
```

**Pros:**
- Handles type mismatches
- CockroachDB-friendly

**Cons:**
- May not be the issue

### Solution 4: Connection Pool Warm-up with Tool Query
**Priority:** Medium  
**Effort:** Medium

On service startup, query for a known tool to verify connection:
```typescript
// In service startup
const testTool = await toolModel.findById('known-tool-id');
if (!testTool) {
  logger.warn('Database connection may be stale - no test tool found');
}
```

**Pros:**
- Early detection
- Validates connection

**Cons:**
- Requires known tool ID
- Doesn't fix the issue

### Solution 5: Database Connection Verification Endpoint
**Priority:** Low  
**Effort:** Low

Add health check that verifies database connectivity:
```typescript
app.get('/health/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM mcp_tools');
    res.json({ 
      status: 'healthy', 
      toolCount: result.rows[0].count 
    });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});
```

**Pros:**
- Diagnostic tool
- Easy to implement

**Cons:**
- Doesn't fix the issue

## 🧪 Testing Plan

### Test Case 1: Verify Database Connection String
```bash
# Check service logs for connection string
# Compare with DATABASE_URL in backend/.env
# Verify they match
```

### Test Case 2: Direct Database Query Test
```bash
# Run test script
node scripts/test-tool-query-simple.js

# Expected: Tool found
# Actual: TBD
```

### Test Case 3: UUID Type Casting
```sql
-- Test in CockroachDB SQL Shell
SELECT * FROM mcp_tools WHERE tool_id::uuid = '940bb568-d19e-42fa-aa10-d880f5267e1c'::uuid;
SELECT * FROM mcp_tools WHERE tool_id = '940bb568-d19e-42fa-aa10-d880f5267e1c';
-- Compare results
```

### Test Case 4: Service Logs Analysis
```bash
# Start service with logging
# Make request to /proxy/{toolId}/tools
# Check logs for:
# - [MCPToolModel.findById] messages
# - Database connection logs
# - Query results
```

### Test Case 5: Connection Pool Reset
```typescript
// After tool insertion, call:
await refreshConnectionPool();
// Then retry query
```

## 📊 Impact Assessment

### User Impact
- **High:** Users cannot use MCP tools in workflows
- **Workflow Builder:** Tools don't appear or methods can't be fetched
- **Developer Experience:** Tool registration appears successful but tools are unusable

### System Impact
- **Service Health:** All services report healthy
- **Database:** No errors, queries work for other operations
- **Performance:** No performance degradation observed

### Business Impact
- **Feature Blocking:** Core workflow functionality is blocked
- **Developer Trust:** Registration process appears broken
- **Time to Resolution:** Critical for production readiness

## 🔗 Related Issues

- Tool registration timeout issues (previous)
- Database connection pool management
- CockroachDB UUID handling
- Service initialization order

## 📝 Additional Context

### Environment
- **Database:** CockroachDB (cloud)
- **Node.js:** v20+
- **Framework:** Express.js
- **ORM:** Raw `pg` queries (no ORM)

### Recent Changes
- Added `protocol` column to `mcp_tools` table
- Modified `MCPToolModel` to include protocol
- Added logging to `findById` method
- Tool inserted directly via SQL (bypassing API)

### Logs Location
- Service logs: Console output from `npm run dev`
- Database logs: CockroachDB console
- Application logs: `[MCPToolModel.findById]` prefixed messages

## 🎁 Bounty Criteria

### Minimum Viable Fix
- ✅ Tool Proxy Service can find tools that exist in database
- ✅ `/proxy/{toolId}/tools` endpoint returns tool methods
- ✅ Solution works after service restart

### Bonus Points
- 🔄 Connection pool management improvements
- 📊 Better error messages and diagnostics
- 🧪 Automated tests for this scenario
- 📝 Documentation of root cause

### Submission Requirements
1. Detailed explanation of root cause
2. Code changes with tests
3. Verification steps
4. Impact analysis

## 👥 Contributors

- **Reporter:** @senti
- **Investigator:** AI Assistant
- **Assignee:** TBD

## 📅 Timeline

- **Reported:** 2025-12-06
- **Status:** 🔴 Open
- **Target Resolution:** TBD

---

**Last Updated:** 2025-12-06  
**Version:** 1.0
