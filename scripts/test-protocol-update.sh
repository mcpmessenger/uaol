#!/bin/bash
# Test script to update protocol column

TOOL_ID="59540a12-6c11-4808-ac5a-9ec60ed9d012"

echo "Testing protocol update for tool: $TOOL_ID"
echo ""

curl -X PUT http://localhost:3002/tools/$TOOL_ID \
  -H "Content-Type: application/json" \
  -d '{"protocol":"rest"}'

echo ""
echo ""
echo "Done!"
