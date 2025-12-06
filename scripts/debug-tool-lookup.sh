#!/bin/bash
# Debug script to check if the fix is working

echo "========================================"
echo "  Debugging Tool Lookup Issue"
echo "========================================"
echo ""

TOOL_ID="940bb568-d19e-42fa-aa10-d880f5267e1c"

echo "1. Checking if compiled code has UUID casting..."
if grep -q "tool_id::uuid" backend/shared/dist/database/models/mcp-tool.js; then
    echo "✅ UUID casting found in compiled code"
else
    echo "❌ UUID casting NOT found - rebuild needed!"
    echo "   Run: cd backend/shared && npm run build"
    exit 1
fi

echo ""
echo "2. Checking if services are running..."
if curl -s http://localhost:3004/health > /dev/null 2>&1; then
    echo "✅ Tool Proxy Service is running"
else
    echo "❌ Tool Proxy Service is NOT running"
    echo "   Start services: cd backend && npm run dev"
    exit 1
fi

echo ""
echo "3. Testing tool lookup..."
RESPONSE=$(curl -s http://localhost:3004/proxy/$TOOL_ID/tools)
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ Tool found!"
elif echo "$RESPONSE" | grep -q '"NOT_FOUND"'; then
    echo "❌ Tool still not found"
    echo ""
    echo "4. Checking service logs..."
    echo "   Look for [MCPToolModel.findById] messages in service output"
    echo "   The query should show: WHERE tool_id::uuid = \$1::uuid"
    echo ""
    echo "5. Verify database connection..."
    echo "   Run: node scripts/test-tool-query-simple.js"
fi

echo ""
echo "Done."
