# ✅ LangchainMCP Tool Registration - COMPLETE

## What We Did

1. ✅ Created `mcp_tools` table with `protocol` column
2. ✅ Created user account (`fae97c83-cdbd-4b2c-a3c2-088e5d1f32cf`)
3. ✅ Inserted LangchainMCP tool directly into database
4. ✅ Tool is set to `protocol: 'rest'` and `status: 'Approved'`

## Next Steps

### 1. Get Your Tool ID

Run this in CockroachDB SQL Shell to get the tool_id:
```sql
SELECT tool_id, name, protocol, status 
FROM mcp_tools 
WHERE name = 'Langchain Agent';
```

Save the `tool_id` - you'll need it for testing.

### 2. Verify Tool Methods

Once your backend services are running, test if the tool methods are available:

```bash
curl http://localhost:3004/proxy/{TOOL_ID}/tools
```

Replace `{TOOL_ID}` with the actual tool_id from step 1.

### 3. Check in Workflow Builder UI

1. Open your workflow builder in the browser
2. Click the node menu (left arrow button)
3. Look for "Langchain Agent" under MCP Tools
4. Click it to see available methods
5. Add it to your workflow

### 4. If Tool Doesn't Appear

- **Refresh the page** - The UI caches tool lists
- **Check browser console** for errors
- **Verify services are running:**
  - API Gateway (port 3000)
  - Tool Registry Service (port 3002)
  - Tool Proxy Service (port 3004)
- **Check service logs** for any errors

## Troubleshooting

### "No methods available"
- Verify tool status is 'Approved' in database
- Check protocol is 'rest' (not 'json-rpc')
- Ensure tool-proxy-service is running
- Check gateway URL is accessible

### Tool doesn't appear in UI
- Verify tool status is 'Approved'
- Check frontend is calling `/tools?status=approved`
- Verify tool-registry-service is running
- Check browser network tab for API errors

## Summary

The tool is now in the database with:
- ✅ Protocol: `rest`
- ✅ Status: `Approved`
- ✅ Gateway URL: `https://langchain-agent-mcp-server-554655392699.us-central1.run.app/mcp`

It should appear in your workflow builder UI once the services are running and the frontend refreshes.
