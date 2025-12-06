# Next Steps After Creating mcp_tools Table

The `mcp_tools` table has been successfully created! Here's what to do next:

## Step 1: Register LangchainMCP Tool (if not already registered)

Run the registration script:
```bash
node scripts/register-langchain-mcp.js
```

Or manually register via API:
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

This will return a `tool_id` - save it for the next steps.

## Step 2: Approve the Tool

After registration, approve the tool:
```bash
curl -X POST http://localhost:3002/tools/{TOOL_ID}/approve
```

Replace `{TOOL_ID}` with the ID from Step 1.

## Step 3: Update Protocol (if needed)

If the tool was registered with the wrong protocol, update it:
```bash
curl -X PUT http://localhost:3002/tools/{TOOL_ID} \
  -H "Content-Type: application/json" \
  -d '{"protocol":"rest"}'
```

## Step 4: Verify Tool Methods

Check if the tool methods are available:
```bash
curl http://localhost:3004/proxy/{TOOL_ID}/tools
```

## Step 5: Test in Workflow Builder UI

1. Open the workflow builder in your browser
2. Click the node menu (left arrow button)
3. Look for "Langchain Agent" under MCP Tools
4. Click it to see available methods
5. Add it to your workflow

## Troubleshooting

If you see "No methods available":
- Check that the tool is approved (status = 'Approved')
- Verify the protocol is set to "rest" (not "json-rpc")
- Check backend service logs for errors
- Ensure the gateway URL is accessible

If the tool doesn't appear in the UI:
- Refresh the page
- Check browser console for errors
- Verify the tool registry service is running on port 3002
- Check that the tool proxy service is running on port 3004
