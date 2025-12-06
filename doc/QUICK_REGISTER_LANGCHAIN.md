# Quick Guide: Register LangchainMCP Tool

## The "Failed to fetch" Error

This error means the **backend services are not running**. You need to start them first.

## Step 1: Start Backend Services

Open **3 separate terminal windows** and run:

### Terminal 1 - API Gateway
```bash
cd backend/services/api-gateway
npm run dev
```

### Terminal 2 - Tool Registry Service
```bash
cd backend/services/tool-registry-service
npm run dev
```

### Terminal 3 - Tool Proxy Service
```bash
cd backend/services/tool-proxy-service
npm run dev
```

Wait until you see messages like "Server running on port 3000" etc.

## Step 2: Register the Tool

Once services are running, open a **new terminal** and run:

### Option A: PowerShell (Windows)
```powershell
$body = @{
    name = "Langchain Agent"
    gateway_url = "https://langchain-agent-mcp-server-554655392699.us-central1.run.app/mcp"
    credit_cost_per_call = 5
    protocol = "rest"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/tools" -Method POST -Body $body -ContentType "application/json"
```

### Option B: curl (Any OS)
```bash
curl -X POST http://localhost:3000/tools \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Langchain Agent",
    "gateway_url": "https://langchain-agent-mcp-server-554655392699.us-central1.run.app/mcp",
    "credit_cost_per_call": 5,
    "protocol": "rest"
  }'
```

### Option C: Browser Console
Open browser DevTools console and run:
```javascript
const response = await fetch('http://localhost:3000/tools', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Langchain Agent',
    gateway_url: 'https://langchain-agent-mcp-server-554655392699.us-central1.run.app/mcp',
    credit_cost_per_call: 5,
    protocol: 'rest'
  })
});
const result = await response.json();
console.log(result);
```

## Step 3: Approve the Tool

After registration, the tool will be in "Pending" status. You need to approve it.

**Get the Tool ID** from the registration response, then:

### PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/tools/TOOL_ID_HERE/approve" -Method POST
```

### curl:
```bash
curl -X POST http://localhost:3000/tools/TOOL_ID_HERE/approve
```

### Or Update Database Directly:
```sql
UPDATE mcp_tools 
SET status = 'Approved' 
WHERE name = 'Langchain Agent';
```

## Step 4: Verify

1. Refresh the workflow builder page
2. Click the chevron button (>) to open the node menu
3. Look for "Langchain Agent" in the **MCP Tools** section at the top
4. Click to expand and see the `agent_executor` method

## Troubleshooting

### Still getting "Failed to fetch"?
- ✅ Check all 3 backend services are running
- ✅ Verify API Gateway is on port 3000
- ✅ Check browser console for CORS errors
- ✅ Try accessing http://localhost:3000/tools directly in browser

### Tool registered but not showing?
- ✅ Make sure status is "Approved" (not "Pending")
- ✅ Click the "Refresh" button in the MCP Tools section
- ✅ Check browser console for errors

### Registration fails?
- ✅ Check if authentication is required (you may need to login first)
- ✅ Verify the gateway URL is accessible
- ✅ Check backend service logs for errors
