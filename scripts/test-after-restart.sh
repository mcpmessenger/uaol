#!/bin/bash
# Test protocol update after restarting the service

TOOL_ID="59540a12-6c11-4808-ac5a-9ec60ed9d012"

echo "Testing protocol update after service restart..."
echo "Tool ID: $TOOL_ID"
echo ""

curl -X PUT http://localhost:3002/tools/$TOOL_ID \
  -H "Content-Type: application/json" \
  -d '{"protocol":"rest"}'

echo ""
echo ""
echo "If this succeeds, you should see:"
echo '  {"success":true,"data":{"tool_id":"...","protocol":"rest",...}}'
echo ""
echo "If it still fails, check:"
echo "  1. Service is restarted"
echo "  2. Service logs for errors"
echo "  3. Database connection is working"
