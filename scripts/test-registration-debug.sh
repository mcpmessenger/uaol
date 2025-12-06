#!/bin/bash
# Debug script to test tool registration

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmYWU5N2M4My1jZGJkLTRiMmMtYTNjMi0wODhlNWQxZjMyY2YiLCJlbWFpbCI6IndpbGxpYW10Zmx5bm5AZ21haWwuY29tIiwic3Vic2NyaXB0aW9uVGllciI6IkZyZWUiLCJpYXQiOjE3NjUwMDAyNjAsImV4cCI6MTc2NTYwNTA2MH0.UqRAwKaH0t21xfbnk4uBC3-ErqmgaiH2otBgCdNjZIA"

echo "=== Testing Service Health ==="
echo ""

echo "1. Testing API Gateway (port 3000)..."
GATEWAY_HEALTH=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://localhost:3000/health 2>&1)
echo "$GATEWAY_HEALTH"
echo ""

echo "2. Testing Tool Registry Service (port 3002)..."
REGISTRY_HEALTH=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://localhost:3002/health 2>&1)
echo "$REGISTRY_HEALTH"
echo ""

echo "=== Testing Tool Registration ==="
echo ""

echo "3. Registering tool..."
REGISTER_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST http://localhost:3000/tools \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Langchain Agent",
    "gateway_url": "https://langchain-agent-mcp-server-554655392699.us-central1.run.app/mcp",
    "credit_cost_per_call": 5,
    "protocol": "rest"
  }' \
  --max-time 15 2>&1)

echo "Response:"
echo "$REGISTER_RESPONSE"
echo ""

# Extract HTTP code
HTTP_CODE=$(echo "$REGISTER_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$REGISTER_RESPONSE" | sed '/HTTP_CODE:/d')

echo "HTTP Status Code: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Registration successful!"
  TOOL_ID=$(echo "$BODY" | grep -o '"tool_id":"[^"]*"' | cut -d'"' -f4)
  if [ -n "$TOOL_ID" ]; then
    echo "Tool ID: $TOOL_ID"
    echo ""
    echo "4. Approving tool..."
    APPROVE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST http://localhost:3000/tools/$TOOL_ID/approve \
      -H "Authorization: Bearer $TOKEN" \
      --max-time 10 2>&1)
    echo "$APPROVE_RESPONSE"
  fi
else
  echo "❌ Registration failed!"
  echo "Response body:"
  echo "$BODY"
fi
