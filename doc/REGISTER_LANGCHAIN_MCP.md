# Registering LangchainMCP Tool

This guide will help you register the LangchainMCP tool and fix the "Failed to fetch" error.

## Prerequisites

1. **Backend services must be running:**
   - API Gateway (port 3000)
   - Tool Registry Service (port 3002)
   - Tool Proxy Service (port 3004)

2. **Check if services are running:**
   ```bash
   # Check API Gateway
   curl http://localhost:3000/health
   
   # Check Tool Registry
   curl http://localhost:3002/tools
   ```

## Step 1: Fix "Failed to fetch" Error

The "Failed to fetch" error usually means:
- Backend services aren't running
- Wrong API URL in frontend
- CORS issues

### Check Frontend API Configuration

1. Check your `.env` file or environment variables:
   ```bash
   VITE_API_BASE_URL=http://localhost:3000
   ```

2. Verify the API Gateway is accessible:
   ```bash
   curl http://localhost:3000/tools
   ```

3. Check browser console for CORS errors

## Step 2: Register LangchainMCP Tool

### Option A: Using the Registration Script

1. Run the registration script:
   ```bash
   node scripts/register-langchain-mcp.js
   ```

2. If you need authentication, add your token:
   ```bash
   # Edit scripts/register-langchain-mcp.js and add your token
   # Or set it as an environment variable
   ```

### Option B: Using curl

```bash
curl -X POST http://localhost:3000/tools \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Langchain Agent",
    "gateway_url": "https://langchain-agent-mcp-server-554655392699.us-central1.run.app/mcp",
    "credit_cost_per_call": 5,
    "protocol": "rest"
  }'
```

### Option C: Using the API Client (Browser Console)

Open browser console and run:

```javascript
const response = await fetch('http://localhost:3000/tools', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Add if you have a token:
    // 'Authorization': `Bearer ${localStorage.getItem('uaol_token')}`
  },
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

After registration, the tool will be in "Pending" status. You need to approve it:

### Option A: Using the API

```bash
curl -X POST http://localhost:3000/tools/TOOL_ID/approve \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Option B: Direct Database Update

If you have database access:

```sql
UPDATE mcp_tools 
SET status = 'Approved' 
WHERE name = 'Langchain Agent';
```

## Step 4: Verify Registration

1. Check if the tool appears in the workflow builder:
   - Open the workflow builder
   - Click the chevron button (>) to open the node menu
   - Look for "Langchain Agent" in the MCP Tools section

2. Test the tool:
   - Add it to a workflow
   - Configure it with a query
   - Execute the workflow

## Troubleshooting

### "Failed to fetch" persists

1. **Check backend services:**
   ```bash
   # Make sure all services are running
   cd backend/services/api-gateway && npm run dev
   cd backend/services/tool-registry-service && npm run dev
   cd backend/services/tool-proxy-service && npm run dev
   ```

2. **Check API Gateway routing:**
   - Verify `/tools` is proxied correctly
   - Check `backend/services/api-gateway/src/index.ts`

3. **Check CORS:**
   - Verify CORS is enabled in API Gateway
   - Check browser console for CORS errors

### Tool doesn't appear after registration

1. **Check tool status:**
   ```bash
   curl http://localhost:3000/tools
   ```
   - Make sure status is "Approved"

2. **Check frontend filtering:**
   - The frontend only shows tools with `status === 'Approved'`
   - Verify in `src/components/workflow/WorkflowToolbar.tsx`

3. **Refresh the workflow builder:**
   - Close and reopen the node menu
   - Click the "Refresh" button in the MCP Tools section

### Tool appears but methods don't load

1. **Verify gateway URL:**
   - Test the manifest endpoint:
   ```bash
   curl https://langchain-agent-mcp-server-554655392699.us-central1.run.app/mcp/manifest
   ```

2. **Check protocol:**
   - Make sure `protocol: "rest"` is set during registration
   - LangchainMCP uses REST, not JSON-RPC

3. **Check API key:**
   - If the tool requires an API key, set it in secrets:
   ```bash
   # This depends on your secrets manager implementation
   ```

## LangchainMCP Service Details

- **Service URL:** https://langchain-agent-mcp-server-554655392699.us-central1.run.app
- **MCP Base Path:** `/mcp`
- **Protocol:** REST
- **Manifest Endpoint:** `GET /mcp/manifest`
- **Invoke Endpoint:** `POST /mcp/invoke`
- **Tool Name:** `agent_executor`

## Quick Reference

**Registration Payload:**
```json
{
  "name": "Langchain Agent",
  "gateway_url": "https://langchain-agent-mcp-server-554655392699.us-central1.run.app/mcp",
  "credit_cost_per_call": 5,
  "protocol": "rest"
}
```

**Test Manifest:**
```bash
curl https://langchain-agent-mcp-server-554655392699.us-central1.run.app/mcp/manifest
```

**Test Invoke:**
```bash
curl -X POST https://langchain-agent-mcp-server-554655392699.us-central1.run.app/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "agent_executor",
    "arguments": {
      "query": "What is 2+2?"
    }
  }'
```
