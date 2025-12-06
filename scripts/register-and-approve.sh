#!/bin/bash
# Register LangchainMCP tool and approve it in one go

API_BASE_URL="http://localhost:3000"

echo "Step 1: Registering LangchainMCP tool..."
echo ""

REGISTER_RESPONSE=$(curl -s -X POST $API_BASE_URL/tools \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Langchain Agent",
    "gateway_url": "https://langchain-agent-mcp-server-554655392699.us-central1.run.app/mcp",
    "credit_cost_per_call": 5,
    "protocol": "rest"
  }')

echo "Registration response:"
echo "$REGISTER_RESPONSE" | jq '.' 2>/dev/null || echo "$REGISTER_RESPONSE"
echo ""

# Extract tool_id from response
TOOL_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.data.tool_id' 2>/dev/null)

if [ -z "$TOOL_ID" ] || [ "$TOOL_ID" = "null" ]; then
  echo "❌ Failed to register tool. Tool ID not found in response."
  exit 1
fi

echo "✅ Tool registered successfully!"
echo "Tool ID: $TOOL_ID"
echo ""
echo "Step 2: Approving tool..."
echo ""

APPROVE_RESPONSE=$(curl -s -X POST $API_BASE_URL/tools/$TOOL_ID/approve \
  -H "Content-Type: application/json")

echo "Approval response:"
echo "$APPROVE_RESPONSE" | jq '.' 2>/dev/null || echo "$APPROVE_RESPONSE"
echo ""

echo "✅ Done! Tool ID: $TOOL_ID"
echo ""
echo "Next steps:"
echo "1. Verify tool methods: curl http://localhost:3004/proxy/$TOOL_ID/tools"
echo "2. Check in workflow builder UI"
