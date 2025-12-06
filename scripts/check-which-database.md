# How to Verify Which Database to Use

## 🔍 Quick Check

### Option 1: Check Service Logs

In your service logs, look for:
```
[DB Connection] DATABASE_URL value: postgresql://will:****@uaol-cluster-10969.jxf.gcp-us-central1.cockroachlabs.cloud:26257/uaol?sslmode...
```

**The cluster name should match:** `uaol-cluster`

### Option 2: Check the Cluster ID

From your CockroachDB console screenshot:
- **Cluster ID in URL:** `88af7680-8ba8-4039-9bd0-8124e15a3ee7`
- **Cluster name:** `uaol-cluster`

**If this matches your DATABASE_URL**, this is the correct database! ✅

### Option 3: Query This Database Directly

In the CockroachDB console you're viewing:

1. Click on **"SQL Shell"** in the left navigation
2. Run this query:

```sql
SELECT tool_id, name, protocol, status 
FROM mcp_tools 
WHERE tool_id = '940bb568-d19e-42fa-aa10-d880f5267e1c'::uuid;
```

**If it returns the tool:** ✅ This is the correct database, tool exists!
**If it returns nothing:** ❌ Tool doesn't exist here, insert it!

## ✅ Decision Guide

### If This IS the Service's Database:
- **Action:** Insert the tool here (if it doesn't exist)
- **How:** Use SQL Shell in this console

### If This is NOT the Service's Database:
- **Action:** Either:
  1. Insert tool into the database the service uses (from DATABASE_URL)
  2. Or update `backend/.env` to point to this database

## 🎯 Recommended: Query First

**Before choosing, run this in the SQL Shell of the database you're viewing:**

```sql
-- Check if tool exists
SELECT tool_id, name, protocol, status 
FROM mcp_tools 
WHERE tool_id = '940bb568-d19e-42fa-aa10-d880f5267e1c'::uuid;

-- Check all tools
SELECT tool_id, name, status, protocol FROM mcp_tools LIMIT 10;
```

This will tell you:
- ✅ Tool exists → This might be the right database
- ❌ Tool doesn't exist → Need to insert it here (if this is the service's database)
