# ⚠️ CRITICAL: Services Must Be Restarted

## 🔴 Current Status

The UUID casting fix has been **compiled successfully**, but the services are **still running the old code**.

**Evidence:**
- ✅ Fix is in `backend/shared/dist/database/models/mcp-tool.js` (line 35: `WHERE tool_id::uuid = $1::uuid`)
- ❌ `curl http://localhost:3004/proxy/940bb568-d19e-42fa-aa10-d880f5267e1c/tools` still returns "Tool not found"
- ❌ Services are using cached/old compiled code

## 🚨 Action Required

### Step 1: Stop All Running Services

**If services are running in a terminal:**
- Press `Ctrl+C` to stop them
- Wait for all processes to exit

**Or kill processes on ports:**
```powershell
# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000,3002,3004 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Step 2: Verify Fix is Compiled

```bash
cd backend/shared
npm run build
```

**Expected:** No errors, build succeeds

### Step 3: Restart Services

```bash
cd backend
npm run dev
```

**Or use startup script:**
```powershell
.\scripts\start-all-services.ps1
```

**Wait 10-15 seconds** for services to fully start.

### Step 4: Test Again

```bash
curl http://localhost:3004/proxy/940bb568-d19e-42fa-aa10-d880f5267e1c/tools
```

**Expected:** Should return tool methods (not "Tool not found")

## 🔍 How to Verify Services Are Using New Code

### Check Service Logs

When you make a request, you should see in the service logs:

```
[MCPToolModel.findById] Looking for tool: 940bb568-d19e-42fa-aa10-d880f5267e1c
[MCPToolModel.findById] Query: SELECT * FROM mcp_tools WHERE tool_id::uuid = $1::uuid
```

**If you see `WHERE tool_id = $1` instead of `WHERE tool_id::uuid = $1::uuid`, the service is still using old code.**

### Verify Compiled Code

```bash
# Check the compiled file
grep "tool_id::uuid" backend/shared/dist/database/models/mcp-tool.js
```

**Should output:** The line with the UUID casting query

## 🐛 If Still Not Working After Restart

1. **Check service logs** for `[MCPToolModel.findById]` messages
2. **Verify database connection** - Run `node scripts/test-tool-query-simple.js`
3. **Check DATABASE_URL** - Ensure service connects to same database where tool was inserted
4. **Verify tool exists** - Run SQL query directly in database

## 📋 Quick Checklist

- [ ] All services stopped
- [ ] Shared package rebuilt (`npm run build` in `backend/shared`)
- [ ] Services restarted (`npm run dev` in `backend`)
- [ ] Waited 10-15 seconds for services to start
- [ ] Tested with curl
- [ ] Checked service logs for UUID casting query

---

**Status:** ⚠️ **RESTART REQUIRED**  
**Fix Status:** ✅ Compiled, but not loaded by services yet
